package com.pulsepay.expensetracker.service;

import com.pulsepay.expensetracker.dto.RegisterRequestDto;
import com.pulsepay.expensetracker.dto.ProfileUpdateRequestDto;
import com.pulsepay.expensetracker.entity.Role;
import com.pulsepay.expensetracker.entity.User;
import com.pulsepay.expensetracker.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(RegisterRequestDto dto) {
        String email = dto.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("An account with this email already exists");
        }
        return userRepository.save(new User(
                email,
                dto.getFullName().trim(),
                passwordEncoder.encode(dto.getPassword()),
                Role.ROLE_USER
        ));
    }

    public User updateProfile(User user, ProfileUpdateRequestDto dto) {
        String email = dto.getEmail().trim().toLowerCase();
        if (!email.equalsIgnoreCase(user.getEmail())
                && userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("An account with this email already exists");
        }
        user.setFullName(dto.getFullName().trim());
        user.setEmail(email);
        return userRepository.save(user);
    }
}
