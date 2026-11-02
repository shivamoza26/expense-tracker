package com.pulsepay.expensetracker.service;

import com.pulsepay.expensetracker.dto.ExpenseRequestDto;
import com.pulsepay.expensetracker.entity.Category;
import com.pulsepay.expensetracker.entity.Expense;
import com.pulsepay.expensetracker.entity.User;
import com.pulsepay.expensetracker.repository.CategoryRepository;
import com.pulsepay.expensetracker.repository.ExpenseRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class ExpenseService {
    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;

    public ExpenseService(ExpenseRepository expenseRepository, CategoryRepository categoryRepository) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
    }

    public List<Expense> findAll(User user, Long categoryId) {
        return categoryId == null
                ? expenseRepository.findByUserOrderByTransactionDateDesc(user)
                : expenseRepository.findByUserAndCategoryIdOrderByAmountDesc(user, categoryId);
    }

    public Expense create(User user, ExpenseRequestDto dto) {
        Expense expense = Expense.builder()
                .amount(dto.getAmount())
                .merchantName(dto.getMerchantName())
                .transactionDate(dto.getTransactionDate() != null ? dto.getTransactionDate() : LocalDate.now())
                .transactionTime(dto.getTransactionTime() != null ? dto.getTransactionTime() : LocalTime.now())
                .note(dto.getNote())
                .category(findCategory(dto.getCategoryId()))
                .user(user)
                .build();
        return expenseRepository.save(expense);
    }

    @Transactional
    public Expense update(User user, Long id, ExpenseRequestDto dto) {
        Expense expense = findExpense(user, id);
        expense.setAmount(dto.getAmount());
        expense.setMerchantName(dto.getMerchantName());
        expense.setTransactionDate(dto.getTransactionDate() != null ? dto.getTransactionDate() : LocalDate.now());
        expense.setTransactionTime(dto.getTransactionTime());
        expense.setNote(dto.getNote());
        expense.setCategory(findCategory(dto.getCategoryId()));
        return expenseRepository.save(expense);
    }

    @Transactional
    public Expense updateCategory(User user, Long id, Long categoryId) {
        Expense expense = findExpense(user, id);
        expense.setCategory(findCategory(categoryId));
        return expenseRepository.save(expense);
    }

    public void delete(User user, Long id) {
        if (!expenseRepository.existsByIdAndUser(id, user)) {
            throw new IllegalArgumentException("Expense not found: " + id);
        }
        expenseRepository.deleteById(id);
    }

    private Expense findExpense(User user, Long id) {
        return expenseRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found: " + id));
    }

    private Category findCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + id));
    }
}
