-- CreateTable
CREATE TABLE "user_hidden_categories" (
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_hidden_categories_pkey" PRIMARY KEY ("user_id","category_id")
);

-- CreateIndex
CREATE INDEX "user_hidden_categories_category_id_idx" ON "user_hidden_categories"("category_id");

-- AddForeignKey
ALTER TABLE "user_hidden_categories" ADD CONSTRAINT "user_hidden_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hidden_categories" ADD CONSTRAINT "user_hidden_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
