package com.pulsepay.expensetracker.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public class ExpenseRequestDto {
    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotBlank(message = "Merchant or payee name is required")
    private String merchantName;

    @PastOrPresent(message = "Invalid date: cannot select future date")
    private LocalDate transactionDate;

    private LocalTime transactionTime;
    private String note;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    private String locationName;
    private Double latitude;
    private Double longitude;
    private String locationSource;

    public BigDecimal getAmount() { return amount; }
    public String getMerchantName() { return merchantName; }
    public LocalDate getTransactionDate() { return transactionDate; }
    public LocalTime getTransactionTime() { return transactionTime; }
    public String getNote() { return note; }
    public Long getCategoryId() { return categoryId; }
    public String getLocationName() { return locationName; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getLocationSource() { return locationSource; }

    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }
    public void setTransactionDate(LocalDate transactionDate) { this.transactionDate = transactionDate; }
    public void setTransactionTime(LocalTime transactionTime) { this.transactionTime = transactionTime; }
    public void setNote(String note) { this.note = note; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public void setLocationName(String locationName) { this.locationName = locationName; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public void setLocationSource(String locationSource) { this.locationSource = locationSource; }
}
