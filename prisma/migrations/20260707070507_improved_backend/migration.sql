-- CreateIndex
CREATE INDEX "Activity_workspaceId_idx" ON "Activity"("workspaceId");

-- CreateIndex
CREATE INDEX "Activity_ts_idx" ON "Activity"("ts");

-- CreateIndex
CREATE INDEX "AiSession_workspaceId_idx" ON "AiSession"("workspaceId");

-- CreateIndex
CREATE INDEX "Container_stackId_idx" ON "Container"("stackId");

-- CreateIndex
CREATE INDEX "Container_status_idx" ON "Container"("status");

-- CreateIndex
CREATE INDEX "SearchLog_engine_idx" ON "SearchLog"("engine");

-- CreateIndex
CREATE INDEX "SearchLog_createdAt_idx" ON "SearchLog"("createdAt");

-- CreateIndex
CREATE INDEX "Stack_workspaceId_idx" ON "Stack"("workspaceId");

-- CreateIndex
CREATE INDEX "Stack_status_idx" ON "Stack"("status");
