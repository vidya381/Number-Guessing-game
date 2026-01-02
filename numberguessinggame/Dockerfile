# Use an official Maven image to build the app
FROM maven:3.8.4-openjdk-17 AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the pom.xml and any other files needed for dependencies first
COPY pom.xml ./
COPY src ./src

# Package the application (this will create the target directory with the jar)
RUN mvn clean package -DskipTests

# Use Eclipse Temurin (official OpenJDK successor) to run the app
FROM eclipse-temurin:17-jre-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the packaged jar file from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port Spring Boot runs on
EXPOSE 8080

# Run the jar file
ENTRYPOINT ["java", "-jar", "app.jar"]
