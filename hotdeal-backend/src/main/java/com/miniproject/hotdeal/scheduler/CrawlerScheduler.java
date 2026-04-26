package com.miniproject.hotdeal.scheduler;

import java.io.BufferedReader;
import java.io.InputStreamReader;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CrawlerScheduler {

    //@Scheduled(fixedDelay = 1800000) // 30분마다 실행, 에펨코리아 봇탐지 기능이 빡세서 로컬로 실행해서 aws DB에 쏘는걸로..
    public void runFMKoreaCrawler() {
        System.out.println("[스케줄러 start] 에펨코리아 핫딜 크롤링을 시작합니다...");

        try {
            // 파이썬 실행 파일(python.exe)과 크롤러 스크립트(main.py)의 절대 경로를 적어야함
            //String pythonExecutable = "python"; // 가상환경을 쓰신다면 가상환경 안의 python.exe 경로 입력
            //String scriptPath = "C:/git/hotdeal/hotdeal-crawler/main.py"; // 실제 main.py 경로로 수정 필수
            String pythonExecutable = "/home/ubuntu/hotdeal-crawler/.venv/bin/python";
            String scriptPath = "/home/ubuntu/hotdeal-crawler/main.py";

            ProcessBuilder pb = new ProcessBuilder(pythonExecutable, scriptPath);

            pb.environment().put("PYTHONIOENCODING", "UTF-8");

            Process process = pb.start();

            // 파이썬 프로그램이 출력하는 로그
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), "UTF-8"));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[Python] " + line);
            }

            // 크롤링이 끝날 때까지 대기
            int exitCode = process.waitFor();
            
            if (exitCode == 0) {
                System.out.println("[FM 크롤링 성공] DB 업데이트가 완료되었습니다");
            } else {
                System.out.println("[FM 크롤링 실패] 에러 코드로 종료됨: " + exitCode);
                // 에러 로그 출력
                BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream(), "UTF-8"));
                while ((line = errorReader.readLine()) != null) {
                    System.err.println("[Python Error] " + line);
                }
            }

        } catch (Exception e) {
            System.err.println("FM 크롤러 실행 중 백엔드 오류 발생!");
            e.printStackTrace();
        }
    }

    @Scheduled(fixedDelay = 900000) // 15분마다 실행
    public void runPpomppuCrawler() {
        System.out.println("[스케줄러 start] 뽐뿌 핫딜 크롤링을 시작합니다...");

        try {
            // 파이썬 실행 파일(python.exe)과 크롤러 스크립트(ppomppu.py)의 절대 경로를 적어야함
            String pythonExecutable = "/home/ubuntu/hotdeal-crawler/.venv/bin/python"; 
            String scriptPath = "/home/ubuntu/hotdeal-crawler/ppomppu_crawler.py";

            ProcessBuilder pb = new ProcessBuilder(pythonExecutable, scriptPath);

            pb.environment().put("PYTHONIOENCODING", "UTF-8");

            Process process = pb.start();

            // 파이썬 프로그램이 출력하는 로그
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), "UTF-8"));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[Python] " + line);
            }

            // 크롤링이 끝날 때까지 대기
            int exitCode = process.waitFor();
            
            if (exitCode == 0) {
                System.out.println("[PPom 크롤링 성공] DB 업데이트가 완료되었습니다");
            } else {
                System.out.println("[PPom 크롤링 실패] 에러 코드로 종료됨: " + exitCode);
                // 에러 로그 출력
                BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream(), "UTF-8"));
                while ((line = errorReader.readLine()) != null) {
                    System.err.println("[Python Error] " + line);
                }
            }

        } catch (Exception e) {
            System.err.println("PPom 크롤러 실행 중 백엔드 오류 발생!");
            e.printStackTrace();
        }
    }
}
