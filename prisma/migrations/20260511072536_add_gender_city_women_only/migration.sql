-- DropIndex
DROP INDEX "RideGroup_status_idx";

-- AlterTable
ALTER TABLE "RideGroup" ADD COLUMN     "city" TEXT,
ADD COLUMN     "destLat" DOUBLE PRECISION,
ADD COLUMN     "destLng" DOUBLE PRECISION,
ADD COLUMN     "originLat" DOUBLE PRECISION,
ADD COLUMN     "originLng" DOUBLE PRECISION,
ADD COLUMN     "womenOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "city" TEXT,
ADD COLUMN     "gender" TEXT;

-- CreateIndex
CREATE INDEX "RideGroup_city_idx" ON "RideGroup"("city");
