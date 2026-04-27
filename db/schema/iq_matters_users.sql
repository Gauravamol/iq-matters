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
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `team_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'zayn','zayn@gmail.cm','Secret123!','user',NULL,'2026-03-07 16:53:37'),(9,'gaurav','gaurav@gm','$2b$10$I.PaSoG9LEwNk7XzCDikr.MYXwrt/z24xqskoA7Rwm4WTOxRgdhqe','admin',NULL,'2026-03-07 18:03:35'),(11,'gt650','gt@gmail.com','asdfghjkl','user',NULL,'2026-03-07 18:44:19'),(22,'thomas','thomas@gmail.com','$2b$10$I13mUMYD4x.cxMPCO22Iu.TnAVBi0ZZTmsA8CkvE4UN5dPAR2o5bu','user',NULL,'2026-03-07 20:51:51'),(23,'bethel','bethel@gmail.com','$2b$10$EGbBz20hMUg3K3Kz5KIn2eUzoLXmTZ88OvhdNXp/HPdtJiiZEKRf6','user',NULL,'2026-03-07 21:01:12'),(25,'lionel messi','lionelmessi@gmail.com','$2b$10$EgvE59MFZg3AwJ2cKNS8AOQJCIMDniB/D1RHrJrqjw.JbCo5K7wYi','user',7,'2026-03-08 09:17:09'),(26,'sam','sam@gamil.com','$2b$10$IiF7KpebNQwaJT2Tiw1LW.9ki5lgRcvdFY9gyXO98ST/LU2bAind.','user',8,'2026-03-08 09:59:45'),(27,'ban','ban@gm','$2b$10$mxzFVPxgHkhvnhmHfQAtC.H1h2PIhxtn7DVggkLmWU9glHrB/nXr2','user',9,'2026-03-08 12:43:57'),(28,'shinchain','shinchain@gm','$2b$10$oRgRQlKHvPLhUoIy/3GK3eqyoC7USvwiSdiMVc9TDC9a0tA2MzbLe','user',10,'2026-03-08 12:58:38'),(29,'bhim','bhim@gm','$2b$10$uvbQYgT7Gt/./iWwgAY2hOfjxQX9YcIO9QXiREXhujK4m/yiRw762','user',11,'2026-03-08 12:59:31'),(30,'ban10','ban10@gm','$2b$10$d/GL3KwjXAqJpHjbefxE/ujFkWAlxkyql/arj6t70HJU53m/Z6QRC','user',12,'2026-03-08 13:00:21'),(31,'gian','gian@gm','$2b$10$1KNkLYRZwwunodrpXROcL.wZC/CVDWsGgrgxguDXPNNmhgs5EGj7u','user',13,'2026-03-08 13:01:16'),(32,'try again','tryagain@gm','$2b$10$jvQdNeXk2Kprqs4ZW.WWkufd8RGpdXWvJyXSLsXCA7vtmMV2s46NW','user',14,'2026-03-08 13:02:03'),(33,'dhurandhar','dhurandhar@gm','$2b$10$oFWiuc375bMP6LOuyGw3vO7nTvQ.O5KLujLpgX/BAnjaSWlPuCo12','user',15,'2026-03-08 13:03:01'),(34,'ninja','ninja@gm','$2b$10$3qopMfjFWs8y3gVC8s2XQeS8yRaqXse0UeyQcZsTPZEL2OT7Y/UZu','user',16,'2026-03-08 13:04:21'),(35,'shishimaru','shishimaru@gm','$2b$10$3KRYggj1GF.fjcozCg.JSO8N2DgJqRg93rjSTfLYAMOGoUbS5M1Yq','user',17,'2026-03-08 13:05:29'),(36,'Black','black@gm','$2b$10$EkRioxNXkkeJYtlotX9nZuJq4qPUyDtHS4M0jEmTNx5fqSaVrQyoi','user',18,'2026-03-08 13:06:16'),(37,'Silver','silver@gm','$2b$10$kMySWXsAzh9Rk.y9uypLg.a.RMVkwp7XG1pIS27oqrteIae0lOQEa','user',19,'2026-03-08 13:07:55'),(38,'Golden','golden@gm','$2b$10$iHv6RMGyh9JLiIZOO1RwTONeDSLHhbS89SmQNHNJLTCnfkh0in.hS','user',20,'2026-03-08 13:08:58'),(39,'Diamond','diamond@gm','$2b$10$C6NpRjw3aq02DYMCQMz5f.AxBt39n62Klz0uka0CaV/kb35QPn7xi','user',21,'2026-03-08 13:10:11'),(40,'Chor','chor@gm','$2b$10$dNFy/fRHYTnmRs85wCpwHeS2qrU621OkjyLDyhQ0SsuyIaWS/RLhq','user',22,'2026-03-08 13:15:41'),(41,'superman','superman@gm','$2b$10$ag8fU2Or8XzmiGUIeZbmcu4G0bkmZ62X8a74LCtPm4vZcf9CIbjve','user',23,'2026-03-08 13:16:39'),(42,'Spiderman','spiderman@gm','$2b$10$n2qcu6Qpx2k66Tky76r5quys2c90n6iQOqmogC9EZcJYVCGnQrsmi','user',24,'2026-03-08 13:17:26'),(43,'sagar','sagar@gm','$2b$10$k5g7Nz5bodCGsszZubp7JuJa03qeZLWOMeGVPalcBN5Tx/cI7ochO','user',25,'2026-03-08 13:18:10');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
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
