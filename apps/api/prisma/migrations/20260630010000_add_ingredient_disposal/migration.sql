-- CreateTable
CREATE TABLE "public"."IngredientDisposal" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ingredientId" INTEGER,
    "name" TEXT NOT NULL,
    "price" INTEGER,
    "lossAmount" INTEGER NOT NULL DEFAULT 0,
    "quantity" DOUBLE PRECISION,
    "unit" "public"."IngredientUnit",
    "category" "public"."IngredientCategory",
    "storage" "public"."StorageType",
    "expireAt" TIMESTAMP(3),
    "discardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngredientDisposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngredientDisposal_userId_discardedAt_idx" ON "public"."IngredientDisposal"("userId", "discardedAt");

-- CreateIndex
CREATE INDEX "IngredientDisposal_ingredientId_idx" ON "public"."IngredientDisposal"("ingredientId");

-- AddForeignKey
ALTER TABLE "public"."IngredientDisposal" ADD CONSTRAINT "IngredientDisposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IngredientDisposal" ADD CONSTRAINT "IngredientDisposal_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
