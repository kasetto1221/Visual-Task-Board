resource "aws_docdb_subnet_group" "main" {
  name        = "${var.app_name}-docdb-subnet-group"
  description = "Subnet group for Visual Task Board DocumentDB"
  subnet_ids  = aws_subnet.private[*].id

  tags = { Name = "${var.app_name}-docdb-subnet-group" }
}

resource "aws_docdb_cluster_parameter_group" "main" {
  family      = "docdb5.0"
  name        = "${var.app_name}-docdb-params"
  description = "DocumentDB cluster parameter group for Visual Task Board"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  tags = { Name = "${var.app_name}-docdb-params" }
}

resource "aws_docdb_cluster" "main" {
  cluster_identifier              = "${var.app_name}-docdb"
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = var.documentdb_username
  master_password                 = var.documentdb_password
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.documentdb.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name

  backup_retention_period = var.documentdb_backup_retention_days
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.app_name}-docdb-final-snapshot"
  storage_encrypted       = true

  tags = { Name = "${var.app_name}-docdb-cluster" }
}

resource "aws_docdb_cluster_instance" "main" {
  count              = var.documentdb_instance_count
  identifier         = "${var.app_name}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.documentdb_instance_class

  tags = { Name = "${var.app_name}-docdb-instance-${count.index}" }
}

# ---- Secrets Manager ----
resource "aws_secretsmanager_secret" "documentdb" {
  name                    = "${var.app_name}/documentdb-credentials"
  description             = "DocumentDB connection credentials for Visual Task Board"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "documentdb" {
  secret_id = aws_secretsmanager_secret.documentdb.id
  secret_string = jsonencode({
    username   = var.documentdb_username
    password   = var.documentdb_password
    host       = aws_docdb_cluster.main.endpoint
    port       = "27017"
    MONGODB_URI = "mongodb://${var.documentdb_username}:${var.documentdb_password}@${aws_docdb_cluster.main.endpoint}:27017/?tls=true&replicaSet=rs0&retryWrites=false&authSource=admin"
  })
}
