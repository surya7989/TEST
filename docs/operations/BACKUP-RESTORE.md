# Database Backup, Restore & Migration Guide

## 1. Automated & Manual Backups

### Generating a Backup via phpMyAdmin
1. In Hostinger hPanel, navigate to **Databases** -> **phpMyAdmin**.
2. Select the `atspecialists` database.
3. Click the **Export** tab.
4. Select **Quick** export method and Format **SQL**.
5. Click **Export** to download `atspecialists.sql`.

### Generating a Backup via SSH / Command Line (VPS / Cloud)
```bash
mysqldump -u <DB_USER> -p <DB_NAME> > backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

---

## 2. Restoring a Database

### Restoring via phpMyAdmin
1. Open **phpMyAdmin** and select your target database.
2. If restoring to a clean database, ensure the database is selected.
3. Click the **Import** tab.
4. Choose the backup `.sql` file.
5. Click **Go**.

### Restoring via MySQL Command Line
```bash
mysql -u <DB_USER> -p <DB_NAME> < backup_file.sql
```

---

## 3. Applying Schema Updates Safely
To initialize or update an existing production database without dropping tables or losing live customer/order data, run:
[`hostinger_schema.sql`](file:///c:/Users/voakh/Downloads/AT%20Specalist/hostinger_schema.sql)

This script uses idempotent `CREATE TABLE IF NOT EXISTS` and `ON DUPLICATE KEY UPDATE` statements that safeguard active records.
