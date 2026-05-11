using Azure;
using Azure.AI.OpenAI;
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RetailFixIt.Infrastructure.OpenAI;

public interface IOpenAIClient
{
    Task<RecommendationResult> GetVendorRecommendationAsync(
        string modelVersion,
        string systemPrompt,
        string jobDescription,
        List<VendorCandidate> candidates,
        double temperature,
        double topP,
        int maxTokens,
        CancellationToken ct = default);

    Task<string> GenerateJobSummaryAsync(
        string modelVersion,
        string systemPrompt,
        string rawDescription,
        CancellationToken ct = default);

    Task<float[]> GetEmbeddingsAsync(string text, CancellationToken ct = default);
}

public class AzureOpenAIClient : IOpenAIClient
{
    private readonly OpenAIClient _client;
    private readonly AsyncRetryPolicy _retryPolicy;
    private readonly AsyncCircuitBreakerPolicy _circuitBreaker;

    public AzureOpenAIClient(string endpoint, string key)
    {
        _client = new OpenAIClient(new Uri(endpoint), new AzureKeyCredential(key));

        _retryPolicy = Policy
            .Handle<RequestFailedException>(ex => ex.Status == 429 || ex.Status >= 500)
            .WaitAndRetryAsync(2, retryAttempt =>
                TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));

        _circuitBreaker = Policy
            .Handle<RequestFailedException>(ex => ex.Status >= 500)
            .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));
    }

    public async Task<RecommendationResult> GetVendorRecommendationAsync(
        string modelVersion,
        string systemPrompt,
        string jobDescription,
        List<VendorCandidate> candidates,
        double temperature,
        double topP,
        int maxTokens,
        CancellationToken ct = default)
    {
        var options = new ChatCompletionsOptions
        {
            DeploymentName = modelVersion,
            Temperature = (float)temperature,
            TopP = (float)topP,
            MaxTokens = maxTokens
        };

        options.Messages.Add(new ChatRequestSystemMessage(systemPrompt));
        options.Messages.Add(new ChatRequestUserMessage($"Job: {jobDescription}\n\nCandidates: {JsonSerializer.Serialize(candidates)}"));

        var response = await _retryPolicy.ExecuteAsync(async () =>
            await _circuitBreaker.ExecuteAsync(async () =>
                await _client.GetChatCompletionsAsync(options, ct)));

        var completion = response.Value.Choices[0].Message.Content;
        var usage = response.Value.Usage;

        // Parse tool call response
        var result = ParseToolResponse(completion);

        return new RecommendationResult
        {
            Candidates = result.Candidates,
            FallbackToHuman = result.FallbackToHuman,
            PromptTokens = usage.PromptTokens,
            CompletionTokens = usage.CompletionTokens
        };
    }

    public async Task<string> GenerateJobSummaryAsync(
        string modelVersion,
        string systemPrompt,
        string rawDescription,
        CancellationToken ct = default)
    {
        var options = new ChatCompletionsOptions
        {
            DeploymentName = modelVersion,
            Temperature = 0.2f,
            MaxTokens = 200
        };

        options.Messages.Add(new ChatRequestSystemMessage(systemPrompt));
        options.Messages.Add(new ChatRequestUserMessage(rawDescription));

        var response = await _retryPolicy.ExecuteAsync(async () =>
            await _circuitBreaker.ExecuteAsync(async () =>
                await _client.GetChatCompletionsAsync(options, ct)));

        return response.Value.Choices[0].Message.Content;
    }

    public async Task<float[]> GetEmbeddingsAsync(string text, CancellationToken ct = default)
    {
        var response = await _client.GetEmbeddingsAsync(
            new EmbeddingsOptions("text-embedding-3-large", new[] { text }),
            ct);

        return response.Value.Data[0].Embedding.ToArray();
    }

    private static ParsedResponse ParseToolResponse(string content)
    {
        try
        {
            // Try to find JSON in the response
            var start = content.IndexOf('{');
            var end = content.LastIndexOf('}');
            if (start >= 0 && end > start)
            {
                var json = content.Substring(start, end - start + 1);
                var result = JsonSerializer.Deserialize<ToolResponse>(json);
                if (result != null)
                {
                    return new ParsedResponse
                    {
                        Candidates = result.Candidates.Select(c => new AICandidateResult
                        {
                            VendorId = c.VendorId,
                            Score = c.Score,
                            Reasoning = c.Reasoning
                        }).ToList(),
                        FallbackToHuman = result.FallbackToHuman
                    };
                }
            }
        }
        catch { }

        return new ParsedResponse { FallbackToHuman = true, Candidates = new() };
    }
}

public class RecommendationResult
{
    public List<AICandidateResult> Candidates { get; set; } = new();
    public bool FallbackToHuman { get; set; }
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
}

public class AICandidateResult
{
    public string VendorId { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public string Reasoning { get; set; } = string.Empty;
}

public class VendorCandidate
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<string> Categories { get; set; } = new();
    public decimal Rating { get; set; }
    public int ActiveJobs { get; set; }
    public int Capacity { get; set; }
}

public class ToolResponse
{
    [JsonPropertyName("candidates")]
    public List<ToolCandidate> Candidates { get; set; } = new();

    [JsonPropertyName("fallbackToHuman")]
    public bool FallbackToHuman { get; set; }
}

public class ToolCandidate
{
    [JsonPropertyName("vendorId")]
    public string VendorId { get; set; } = string.Empty;

    [JsonPropertyName("score")]
    public decimal Score { get; set; }

    [JsonPropertyName("reasoning")]
    public string Reasoning { get; set; } = string.Empty;
}

public class ParsedResponse
{
    public List<AICandidateResult> Candidates { get; set; } = new();
    public bool FallbackToHuman { get; set; }
}
