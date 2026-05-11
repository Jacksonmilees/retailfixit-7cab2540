namespace RetailFixIt.Infrastructure.Data;

public static class TenantContext
{
    private static readonly AsyncLocal<Guid?> _currentTenantId = new();

    public static Guid? Current
    {
        get => _currentTenantId.Value;
        set => _currentTenantId.Value = value;
    }

    public static void Clear()
    {
        _currentTenantId.Value = null;
    }
}
