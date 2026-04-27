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
-- Table structure for table `players`
--

DROP TABLE IF EXISTS `players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `players` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int DEFAULT NULL,
  `player_name` varchar(100) DEFAULT NULL,
  `player_uid` varchar(100) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `players`
--

LOCK TABLES `players` WRITE;
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` VALUES (19,7,'Player 1','12',NULL),(20,7,'Player 2','23',NULL),(21,7,'Player 3','45',NULL),(22,7,'Player 4','67',NULL),(23,8,'Player 1','1',NULL),(24,8,'Player 2','2',NULL),(25,8,'Player 3','3',NULL),(26,8,'Player 4','4',NULL),(33,9,'Player 1','1',NULL),(34,9,'Player 2','2',NULL),(35,9,'Player 3','3',NULL),(36,10,'Player 1','1',NULL),(37,10,'Player 2','2',NULL),(38,11,'Player 1','1',NULL),(39,11,'Player 2','2',NULL),(40,11,'Player 3','3',NULL),(41,12,'Player 1','1',NULL),(42,12,'Player 2','2',NULL),(43,12,'Player 3','3',NULL),(44,12,'Player 4','4',NULL),(45,13,'Player 1','1',NULL),(46,13,'Player 2','2',NULL),(47,13,'Player 3','3',NULL),(48,14,'Player 1','1',NULL),(49,14,'Player 2','2',NULL),(50,14,'Player 3','3',NULL),(51,14,'Player 4','4',NULL),(52,15,'Player 1','11',NULL),(53,15,'Player 2','12',NULL),(54,15,'Player 3','13',NULL),(55,15,'Player 4','14',NULL),(56,16,'Player 1','21',NULL),(57,16,'Player 2','22',NULL),(58,16,'Player 3','23',NULL),(59,16,'Player 4','24',NULL),(60,17,'Player 1','31',NULL),(61,17,'Player 2','32',NULL),(62,17,'Player 3','33',NULL),(63,17,'Player 4','34',NULL),(64,18,'Player 1','41',NULL),(65,18,'Player 2','42',NULL),(66,18,'Player 3','43',NULL),(67,18,'Player 4','44',NULL),(68,19,'Player 1','51',NULL),(69,19,'Player 2','52',NULL),(70,19,'Player 3','53',NULL),(71,19,'Player 4','54',NULL),(72,20,'Player 1','61',NULL),(73,20,'Player 2','62',NULL),(74,20,'Player 3','63',NULL),(75,20,'Player 4','64',NULL),(76,21,'Player 1','71',NULL),(77,21,'Player 2','72',NULL),(78,21,'Player 3','73',NULL),(79,21,'Player 4','74',NULL),(80,22,'Player 1','71',NULL),(81,22,'Player 2','72',NULL),(82,22,'Player 3','73',NULL),(83,22,'Player 4','74',NULL),(84,23,'Player 1','81',NULL),(85,23,'Player 2','82',NULL),(86,23,'Player 3','83',NULL),(87,23,'Player 4','84',NULL),(88,24,'Player 1','91',NULL),(89,24,'Player 2','92',NULL),(90,24,'Player 3','93',NULL),(91,24,'Player 4','94',NULL),(92,25,'Player 1','101',NULL),(93,25,'Player 2','102',NULL),(94,25,'Player 3','103',NULL),(95,25,'Player 4','104',NULL);
/*!40000 ALTER TABLE `players` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-26  0:37:58
