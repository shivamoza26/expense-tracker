package com.pulsepay.expensetracker.controller;

import com.pulsepay.expensetracker.dto.ExpenseRequestDto;
import com.pulsepay.expensetracker.entity.Expense;
import com.pulsepay.expensetracker.entity.User;
import com.pulsepay.expensetracker.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/expenses")
public class ExpenseController {
    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @GetMapping
    public List<Expense> getAllExpenses(
            @RequestParam(required = false) Long categoryId,
            org.springframework.security.core.Authentication authentication
    ) {
        return expenseService.findAll((User) authentication.getPrincipal(), categoryId);
    }

    @PostMapping
    public ResponseEntity<Expense> createExpense(
            @Valid @RequestBody ExpenseRequestDto dto,
            org.springframework.security.core.Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(expenseService.create((User) authentication.getPrincipal(), dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Expense> updateExpense(
            @PathVariable Long id,
            @Valid @RequestBody ExpenseRequestDto dto,
            org.springframework.security.core.Authentication authentication
    ) {
        return ResponseEntity.ok(expenseService.update((User) authentication.getPrincipal(), id, dto));
    }

    @PatchMapping("/{id}/category")
    public ResponseEntity<Expense> updateCategory(
            @PathVariable Long id,
            @RequestParam Long categoryId,
            org.springframework.security.core.Authentication authentication
    ) {
        return ResponseEntity.ok(expenseService.updateCategory(
                (User) authentication.getPrincipal(), id, categoryId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable Long id,
            org.springframework.security.core.Authentication authentication
    ) {
        expenseService.delete((User) authentication.getPrincipal(), id);
        return ResponseEntity.noContent().build();
    }
}
