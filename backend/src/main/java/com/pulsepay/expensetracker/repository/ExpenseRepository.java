package com.pulsepay.expensetracker.repository;

import com.pulsepay.expensetracker.entity.Expense;
import com.pulsepay.expensetracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByTransactionDateBetweenOrderByTransactionDateDesc(LocalDate start, LocalDate end);
    List<Expense> findByUserAndCategoryIdOrderByAmountDesc(User user, Long categoryId);
    List<Expense> findByUserOrderByTransactionDateDesc(User user);
    boolean existsByIdAndUser(Long id, User user);
    java.util.Optional<Expense> findByIdAndUser(Long id, User user);
}
