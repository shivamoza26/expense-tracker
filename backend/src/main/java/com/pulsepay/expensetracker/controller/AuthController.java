package com.pulsepay.expensetracker.controller;

import com.pulsepay.expensetracker.dto.LoginRequestDto;
import com.pulsepay.expensetracker.dto.RegisterRequestDto;
import com.pulsepay.expensetracker.dto.ProfileUpdateRequestDto;
import com.pulsepay.expensetracker.entity.User;
import com.pulsepay.expensetracker.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final AuthService authService;

    public AuthController(AuthenticationManager authenticationManager, AuthService authService) {
        this.authenticationManager = authenticationManager;
        this.authService = authService;
    }

    @PostMapping("/login")
    public Map<String, Object> login(
            @Valid @RequestBody LoginRequestDto dto,
            HttpServletRequest request
    ) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(dto.getEmail().trim().toLowerCase(), dto.getPassword())
        );
        request.getSession(true).setAttribute("SPRING_SECURITY_CONTEXT",
                new org.springframework.security.core.context.SecurityContextImpl(authentication));
        return userResponse((User) authentication.getPrincipal());
    }

    @PostMapping("/register")
    public Map<String, Object> register(
            @Valid @RequestBody RegisterRequestDto dto,
            HttpServletRequest request
    ) {
        User user = authService.register(dto);
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(dto.getEmail().trim().toLowerCase(), dto.getPassword())
        );
        request.getSession(true).setAttribute("SPRING_SECURITY_CONTEXT",
                new org.springframework.security.core.context.SecurityContextImpl(authentication));
        return userResponse(user);
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        return userResponse((User) authentication.getPrincipal());
    }

    @PutMapping("/profile")
    public Map<String, Object> updateProfile(
            @Valid @RequestBody ProfileUpdateRequestDto dto,
            Authentication authentication
    ) {
        return userResponse(authService.updateProfile((User) authentication.getPrincipal(), dto));
    }

    private Map<String, Object> userResponse(User user) {
        return Map.of(
                "id", user.getId(),
                "fullName", user.getFullName(),
                "username", user.getEmail().substring(0, user.getEmail().indexOf('@')),
                "email", user.getEmail(),
                "role", user.getRole().name()
        );
    }
}
