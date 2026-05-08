resource "aws_db_subnet_group" "main" {
  name        = "${var.app_name}-db-subnet-group"
  description = "Subnet group for Visual Task Board RDS"
  subnet_ids  = aws_subnet.private[*].id

  tags = { Name = "${var.app_name}-db-subnet-group" }
}

resource "aws_db_instance" "main" {
  identifier        = "${var.app_name}-db"
  engine            = "postgres"
  engine_version    = "16.3"
  instance_class    = var.db_instance_class
  db_name           = var.db_name
  username          = var.db_username
  password          = var.db_password
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  multi_az               = var.db_multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.db_backup_retention_days
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.app_name}-db-final-snapshot"

  tags = { Name = "${var.app_name}-rds" }
}

# ---- Secrets Manager ----
resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.app_name}/db-credentials"
  description             = "RDS connection credentials for Visual Task Board"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username     = var.db_username
    password     = var.db_password
    host         = aws_db_instance.main.address
    port         = "5432"
    dbname       = var.db_name
    DATABASE_URL = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:5432/${var.db_name}"
  })
}
