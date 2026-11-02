package com.pulsepay.expensetracker.config;

import com.pulsepay.expensetracker.entity.Category;
import com.pulsepay.expensetracker.entity.Expense;
import com.pulsepay.expensetracker.entity.Role;
import com.pulsepay.expensetracker.entity.User;
import com.pulsepay.expensetracker.repository.CategoryRepository;
import com.pulsepay.expensetracker.repository.ExpenseRepository;
import com.pulsepay.expensetracker.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Configuration
public class DemoDataInitializer {
    public static final String DEMO_EMAIL = "demo@pulsepay.in";
    public static final String DEMO_PASSWORD = "Demo@12345";

    @Bean
    CommandLineRunner initializeDemoData(
            UserRepository userRepository,
            CategoryRepository categoryRepository,
            ExpenseRepository expenseRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            User demoUser = userRepository.findByEmailIgnoreCase(DEMO_EMAIL).orElseGet(() ->
                    userRepository.save(new User(
                            DEMO_EMAIL,
                            "PulsePay Demo User",
                            passwordEncoder.encode(DEMO_PASSWORD),
                            Role.ROLE_USER
                    )));

            List<Expense> demoExpenses = expenseRepository.findByUserOrderByTransactionDateDesc(demoUser);
            seedIfMissing(expenseRepository, categoryRepository, demoUser, demoExpenses,
                    "Monthly Groceries", "1600.00", "2026-10-06", "18:20", 2L);
            seedIfMissing(expenseRepository, categoryRepository, demoUser, demoExpenses,
                    "Metro Recharge", "500.00", "2026-10-15", "09:10", 5L);
            seedIfMissing(expenseRepository, categoryRepository, demoUser, demoExpenses,
                    "Dinner", "850.00", "2026-10-21", "20:15", 3L);
            seedIfMissing(expenseRepository, categoryRepository, demoUser, demoExpenses,
                    "Monthly Rent", "18000.00", "2026-09-01", "10:00", 1L);
            seedIfMissing(expenseRepository, categoryRepository, demoUser, demoExpenses,
                    "Electricity Bill", "1250.00", "2026-08-12", "14:30", 4L);
            seedHistoricalExpenses(expenseRepository, categoryRepository, demoUser, demoExpenses);
        };
    }

    private void seedHistoricalExpenses(
            ExpenseRepository expenses,
            CategoryRepository categories,
            User user,
            List<Expense> existingExpenses
    ) {
        String[] merchants = {
                "FreshMart Groceries", "City Metro", "Cafe Coffee", "Pharmacy Plus",
                "Utility Board", "QuickCab", "StreamFlix", "Home Essentials",
                "Weekend Dining", "Fuel Station", "Online Marketplace", "Gym Membership"
        };
        Long[] categoryIds = {2L, 4L, 3L, 7L, 4L, 4L, 13L, 16L, 3L, 4L, 1L, 20L};

        for (int year = 2023; year <= 2025; year++) {
            for (int month = 1; month <= 12; month++) {
                int index = month - 1;
                String merchant = merchants[index] + " " + year;
                String amount = String.format(
                        "%d.00",
                        350 + ((year - 2023) * 137 + month * 83 + index * 47) % 3200
                );
                String date = LocalDate.of(year, month, 5 + (month * 2) % 20).toString();
                String time = String.format("%02d:%02d", 9 + (month % 10), (month * 7) % 60);
                seedIfMissing(
                        expenses,
                        categories,
                        user,
                        existingExpenses,
                        merchant,
                        amount,
                        date,
                        time,
                        categoryIds[index]
                );
            }
        }
    }

    private void seedIfMissing(
            ExpenseRepository expenses,
            CategoryRepository categories,
            User user,
            List<Expense> existingExpenses,
            String merchant,
            String amount,
            String date,
            String time,
            Long categoryId
    ) {
        if (existingExpenses.stream().noneMatch(expense -> merchant.equals(expense.getMerchantName()))) {
            addExpense(expenses, categories, user, merchant, amount, date, time, categoryId);
        }
    }

    private void addExpense(
            ExpenseRepository expenses,
            CategoryRepository categories,
            User user,
            String merchant,
            String amount,
            String date,
            String time,
            Long categoryId
    ) {
        Category category = categories.findById(categoryId)
                .orElseThrow(() -> new IllegalStateException("Missing category: " + categoryId));
        expenses.save(Expense.builder()
                .user(user)
                .category(category)
                .merchantName(merchant)
                .amount(new BigDecimal(amount))
                .transactionDate(LocalDate.parse(date))
                .transactionTime(LocalTime.parse(time))
                .note("Demo transaction")
                .build());
    }
}
