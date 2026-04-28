/*
  Warnings:

  - You are about to drop the column `bookingId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the `Booking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ride` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[groupId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `groupId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('OPEN', 'FULL', 'DEPARTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'CONFIRMED', 'LEFT');

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_rideId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_driverId_fkey";

-- DropIndex
DROP INDEX "Payment_bookingId_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "bookingId",
ADD COLUMN     "groupId" TEXT NOT NULL,
ALTER COLUMN "amount" SET DEFAULT 30;

-- DropTable
DROP TABLE "Booking";

-- DropTable
DROP TABLE "Ride";

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "RideStatus";

-- CreateTable
CREATE TABLE "RideGroup" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "availableSlots" INTEGER NOT NULL,
    "estimatedFare" DOUBLE PRECISION NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "whatsappLink" TEXT,
    "olaDeepLink" TEXT,
    "uberDeepLink" TEXT,
    "platformFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'PENDING',
    "share" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RideGroup_organizerId_idx" ON "RideGroup"("organizerId");

-- CreateIndex
CREATE INDEX "RideGroup_origin_destination_idx" ON "RideGroup"("origin", "destination");

-- CreateIndex
CREATE INDEX "RideGroup_departureTime_idx" ON "RideGroup"("departureTime");

-- CreateIndex
CREATE INDEX "RideGroup_status_idx" ON "RideGroup"("status");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_groupId_key" ON "Payment"("groupId");

-- AddForeignKey
ALTER TABLE "RideGroup" ADD CONSTRAINT "RideGroup_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RideGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RideGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
