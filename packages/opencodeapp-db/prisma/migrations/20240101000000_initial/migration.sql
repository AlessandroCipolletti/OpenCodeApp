-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "schema_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "api_key_hash" TEXT,
    "api_key_enc" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_change_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "agent_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_change_patches" (
    "id" TEXT NOT NULL,
    "change_request_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "patch_content" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_change_patches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_releases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT,
    "snapshot" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_rollbacks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "release_id" TEXT NOT NULL,
    "rolled_back_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "agent_rollbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_schema_name_key" ON "tenants"("schema_name");

-- CreateIndex
CREATE UNIQUE INDEX "llm_settings_tenant_id_key" ON "llm_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_releases_tenant_id_version_key" ON "agent_releases"("tenant_id", "version");

-- AddForeignKey
ALTER TABLE "llm_settings" ADD CONSTRAINT "llm_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_change_requests" ADD CONSTRAINT "agent_change_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_change_patches" ADD CONSTRAINT "agent_change_patches_change_request_id_fkey" FOREIGN KEY ("change_request_id") REFERENCES "agent_change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_releases" ADD CONSTRAINT "agent_releases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_rollbacks" ADD CONSTRAINT "agent_rollbacks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
