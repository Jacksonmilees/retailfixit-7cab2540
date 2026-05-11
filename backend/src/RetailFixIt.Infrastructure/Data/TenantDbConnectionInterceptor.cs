using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;

namespace RetailFixIt.Infrastructure.Data;

public class TenantDbConnectionInterceptor : DbConnectionInterceptor
{
    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        if (TenantContext.Current.HasValue && connection is SqlConnection sqlConnection)
        {
            using var cmd = sqlConnection.CreateCommand();
            cmd.CommandText = "EXEC sp_set_session_context 'TenantId', @TenantId;";
            var param = cmd.CreateParameter();
            param.ParameterName = "@TenantId";
            param.Value = TenantContext.Current.Value.ToString();
            cmd.Parameters.Add(param);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await base.ConnectionOpenedAsync(connection, eventData, cancellationToken);
    }

    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        if (TenantContext.Current.HasValue && connection is SqlConnection sqlConnection)
        {
            using var cmd = sqlConnection.CreateCommand();
            cmd.CommandText = "EXEC sp_set_session_context 'TenantId', @TenantId;";
            var param = cmd.CreateParameter();
            param.ParameterName = "@TenantId";
            param.Value = TenantContext.Current.Value.ToString();
            cmd.Parameters.Add(param);
            cmd.ExecuteNonQuery();
        }

        base.ConnectionOpened(connection, eventData);
    }
}
