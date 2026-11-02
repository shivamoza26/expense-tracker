package com.pulsepay.expensetracker.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "expenses")
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than zero")
    @Column(nullable = false)
    private BigDecimal amount;

    @NotBlank(message = "Merchant name is required")
    @Column(nullable = false)
    private String merchantName;

    @PastOrPresent(message = "Invalid date: cannot select future date")
    @Column(nullable = false)
    private LocalDate transactionDate;

    private LocalTime transactionTime;
    private String note;
    private String locationName;
    private Double latitude;
    private Double longitude;
    private String locationSource;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @PrePersist
    public void prePersistDefaults() {
        if (this.transactionDate == null) {
            this.transactionDate = LocalDate.now();
        }
        if (this.transactionTime == null) {
            this.transactionTime = LocalTime.now();
        }
    }

    public Expense() {}

    public Long getId() { return id; }
    public BigDecimal getAmount() { return amount; }
    public String getMerchantName() { return merchantName; }
    public LocalDate getTransactionDate() { return transactionDate; }
    public LocalTime getTransactionTime() { return transactionTime; }
    public String getNote() { return note; }
    public String getLocationName() { return locationName; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getLocationSource() { return locationSource; }
    public Category getCategory() { return category; }
    public User getUser() { return user; }
    public void setId(Long id) { this.id = id; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }
    public void setTransactionDate(LocalDate transactionDate) { this.transactionDate = transactionDate; }
    public void setTransactionTime(LocalTime transactionTime) { this.transactionTime = transactionTime; }
    public void setNote(String note) { this.note = note; }
    public void setLocationName(String locationName) { this.locationName = locationName; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public void setLocationSource(String locationSource) { this.locationSource = locationSource; }
    public void setCategory(Category category) { this.category = category; }
    public void setUser(User user) { this.user = user; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final Expense expense = new Expense();
        public Builder amount(BigDecimal value) { expense.amount = value; return this; }
        public Builder merchantName(String value) { expense.merchantName = value; return this; }
        public Builder transactionDate(LocalDate value) { expense.transactionDate = value; return this; }
        public Builder transactionTime(LocalTime value) { expense.transactionTime = value; return this; }
        public Builder note(String value) { expense.note = value; return this; }
        public Builder category(Category value) { expense.category = value; return this; }
        public Builder user(User value) { expense.user = value; return this; }
        public Builder locationName(String value) { expense.locationName = value; return this; }
        public Builder latitude(Double value) { expense.latitude = value; return this; }
        public Builder longitude(Double value) { expense.longitude = value; return this; }
        public Builder locationSource(String value) { expense.locationSource = value; return this; }
        public Expense build() { return expense; }
    }
}
