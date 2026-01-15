package com.example.numberguessinggame;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NumberGuessingGameApplication {

    public static void main(String[] args) {
        SpringApplication.run(NumberGuessingGameApplication.class, args);
    }
}