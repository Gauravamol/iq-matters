CREATE DATABASE  IF NOT EXISTS `railway` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `railway`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: iq_matters
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `media_assets`
--

DROP TABLE IF EXISTS `media_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `media_assets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `page_name` varchar(50) NOT NULL,
  `media_type` enum('image','video') NOT NULL DEFAULT 'image',
  `url` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_media_assets_page_created` (`page_name`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `media_assets`
--

LOCK TABLES `media_assets` WRITE;
/*!40000 ALTER TABLE `media_assets` DISABLE KEYS */;
INSERT INTO `media_assets` VALUES (8,'matches','image','https://www.battlegroundsmobileindia.com/data/board/2/893/Ban-pan-web-banner_September.png','2026-03-08 07:58:34'),(10,'tournaments','image','https://esports-battlegroundsmobileindia.com/images/static-images/BGIS_2026/banner_desktop.png','2026-03-08 08:12:01'),(11,'leaderboard','video','https://youtu.be/NP-uLAZo1yc','2026-03-08 08:19:51'),(12,'leaderboard','image','https://imgs.search.brave.com/Krzjby7BhpRxTwytiUJLJ2qVY6659Ve54ca57dNfZMU/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzL2VmL2Rk/L2IwL2VmZGRiMDQ5/YWZhMDkwMzNmNDQ3/OTRmNTFjMThkOTky/LmpwZw','2026-03-08 08:29:09'),(13,'leaderboard','image','https://wallpaperaccess.com/full/7447747.jpg','2026-03-08 08:30:58'),(14,'leaderboard','image','https://wallpaperaccess.com/full/6766578.jpg','2026-03-08 08:31:37'),(15,'dashboard','image','https://wallpaperaccess.com/full/9411718.jpg','2026-03-08 08:32:50'),(18,'team-dashboard','image','https://template.canva.com/EAGNmlDkn_E/1/0/1600w-5jwxy30EHwI.jpg','2026-03-08 17:53:29'),(19,'team-dashboard','image','file:///C:/Users/Gaurav/Downloads/Green%20Black%20Modern%20Game%20Presentation.png','2026-03-08 18:08:16'),(20,'team-dashboard','image','file:///C:/Users/Gaurav/Downloads/Green%20Black%20Modern%20Game%20Presentation.png','2026-03-08 18:08:40'),(21,'team-dashboard','image','https://static.vecteezy.com/system/resources/previews/003/042/354/non_2x/car-wrap-company-design-graphic-background-designs-for-vehicle-livery-vector.jpg','2026-03-10 17:12:33'),(22,'team-dashboard','image','https://www.shutterstock.com/image-vector/flowing-rally-flag-background-light-600w-2488437395.jpg','2026-03-10 17:19:30'),(27,'home','image','http://localhost:3000/uploads/media/1773171224837-dodge-591263713542.png','2026-03-10 19:33:46');
/*!40000 ALTER TABLE `media_assets` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-26  0:37:59
