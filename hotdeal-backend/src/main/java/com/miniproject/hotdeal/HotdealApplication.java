package com.miniproject.hotdeal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class HotdealApplication {

	public static void main(String[] args) {
		SpringApplication.run(HotdealApplication.class, args);
	}

}
