$ErrorActionPreference = "Stop"

$serverInstance = "localhost" # Adjust if named instance like .\SQLEXPRESS
$dbName = "SeatSyncDB"
$loginName = "seatsync_user"
$loginPass = "SeatSync@123"

# SQL Queries
$sqlCreateDB = "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '$dbName') CREATE DATABASE [$dbName]"

$sqlCreateLogin = @"
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = '$loginName')
BEGIN
    CREATE LOGIN [$loginName] WITH PASSWORD = '$loginPass', CHECK_POLICY = OFF
END
ELSE
BEGIN
    ALTER LOGIN [$loginName] WITH PASSWORD = '$loginPass'
END
"@

$sqlCreateUser = @"
USE [$dbName]
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '$loginName')
BEGIN
    CREATE USER [$loginName] FOR LOGIN [$loginName]
END
ALTER ROLE [db_owner] ADD MEMBER [$loginName]
"@

# Helper function to execute SQL
function Execute-SQL {
    param(
        [string]$query,
        [string]$database = "master"
    )
    
    $connString = "Server=$serverInstance;Database=$database;Integrated Security=True;"
    $connection = New-Object System.Data.SqlClient.SqlConnection $connString
    
    try {
        $connection.Open()
        $command = $connection.CreateCommand()
        $command.CommandText = $query
        $command.ExecuteNonQuery() 
        Write-Host "Executed Query Successfully on $database"
    } catch {
        Write-Error "SQL Error: $($_.Exception.Message)"
        throw $_
    } finally {
        if ($connection.State -eq 'Open') { $connection.Close() }
    }
}

try {
    Write-Host "1. Creating Database '$dbName' if missing..."
    Execute-SQL -query $sqlCreateDB -database "master"

    Write-Host "2. Creating/Resetting Login '$loginName'..."
    Execute-SQL -query $sqlCreateLogin -database "master"

    Write-Host "3. Assigning User to Database..."
    Execute-SQL -query $sqlCreateUser -database "master"

    Write-Host "SUCCESS: User '$loginName' configured successfully."
} catch {
    Write-Host "FAILED: Could not configure database. Ensure you are running as Admin or have SQL Access."
    exit 1
}
