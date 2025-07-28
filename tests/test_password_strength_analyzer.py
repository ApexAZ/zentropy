"""
Tests for Advanced Password Strength Analyzer

Comprehensive tests for entropy calculation, pattern detection,
and complexity scoring to ensure robust password security validation.
"""

import pytest
from api.password_strength_analyzer import (
    PasswordStrengthAnalyzer,
    PasswordAnalysis,
    PasswordWeakness,
    analyze_password_strength,
)


class TestPasswordStrengthAnalyzer:
    """Test the core PasswordStrengthAnalyzer functionality"""

    def test_entropy_calculation_basic(self):
        """Test basic entropy calculation for different password types"""
        analyzer = PasswordStrengthAnalyzer()
        
        # Simple lowercase password
        entropy = analyzer._calculate_entropy("password")
        assert entropy > 0  # Should have some entropy
        assert entropy < 40  # But not too high due to weak character set
        
        # Mixed case with numbers and symbols
        entropy_strong = analyzer._calculate_entropy("MyP@ssw0rd123!")
        assert entropy_strong > entropy  # Should be higher than simple password
        
        # Empty password
        assert analyzer._calculate_entropy("") == 0.0

    def test_character_set_size_detection(self):
        """Test character set size calculation"""
        analyzer = PasswordStrengthAnalyzer()
        
        # Only lowercase
        assert analyzer._get_character_set_size("password") == 26
        
        # Lowercase + uppercase
        assert analyzer._get_character_set_size("Password") == 52
        
        # Lowercase + uppercase + digits
        assert analyzer._get_character_set_size("Password123") == 62
        
        # Full character set
        assert analyzer._get_character_set_size("P@ssw0rd!") == 94

    def test_keyboard_pattern_detection(self):
        """Test detection of keyboard patterns"""
        analyzer = PasswordStrengthAnalyzer()
        
        # Common keyboard patterns
        assert analyzer._detect_keyboard_patterns("qwerty123") == [PasswordWeakness.KEYBOARD_PATTERN]
        assert analyzer._detect_keyboard_patterns("12345678") == [PasswordWeakness.KEYBOARD_PATTERN]
        assert analyzer._detect_keyboard_patterns("asdfgh") == [PasswordWeakness.KEYBOARD_PATTERN]
        
        # Reverse patterns
        assert analyzer._detect_keyboard_patterns("ytrewq") == [PasswordWeakness.KEYBOARD_PATTERN]
        
        # No patterns
        assert analyzer._detect_keyboard_patterns("MySecureP@ss") == []

    def test_repetition_detection(self):
        """Test detection of repeated characters"""
        analyzer = PasswordStrengthAnalyzer()
        
        # Repeated single characters
        assert analyzer._detect_repetition("Passsssword") == [PasswordWeakness.REPEATED_CHARS]
        assert analyzer._detect_repetition("aaaaaa") == [PasswordWeakness.REPEATED_CHARS]
        
        # Repeated character groups
        assert analyzer._detect_repetition("abcabc123") == [PasswordWeakness.REPEATED_CHARS]
        assert analyzer._detect_repetition("123123456") == [PasswordWeakness.REPEATED_CHARS]
        
        # No repetition
        assert analyzer._detect_repetition("MySecurePassword") == []

    def test_sequence_detection(self):
        """Test detection of sequential characters"""
        analyzer = PasswordStrengthAnalyzer()
        
        # Alphabetic sequences
        assert analyzer._detect_sequences("abcdefgh") == [PasswordWeakness.SEQUENTIAL_CHARS]
        assert analyzer._detect_sequences("xyz123") == [PasswordWeakness.SEQUENTIAL_CHARS]
        
        # Numeric sequences
        assert analyzer._detect_sequences("123456") == [PasswordWeakness.SEQUENTIAL_CHARS]
        assert analyzer._detect_sequences("password789") == [PasswordWeakness.SEQUENTIAL_CHARS]
        
        # Reverse sequences
        assert analyzer._detect_sequences("cba321") == [PasswordWeakness.SEQUENTIAL_CHARS]
        
        # No sequences
        assert analyzer._detect_sequences("MyP@ssw0rd") == []

    def test_dictionary_word_detection(self):
        """Test detection of common dictionary words"""
        analyzer = PasswordStrengthAnalyzer()
        
        # Exact matches
        assert analyzer._detect_dictionary_words("password") == [PasswordWeakness.DICTIONARY_WORD]
        assert analyzer._detect_dictionary_words("admin") == [PasswordWeakness.DICTIONARY_WORD]
        
        # Case variations
        assert analyzer._detect_dictionary_words("PASSWORD") == [PasswordWeakness.DICTIONARY_WORD]
        assert analyzer._detect_dictionary_words("Admin") == [PasswordWeakness.DICTIONARY_WORD]
        
        # Words contained in password
        assert analyzer._detect_dictionary_words("mypassword123") == [PasswordWeakness.DICTIONARY_WORD]
        
        # No dictionary words
        assert analyzer._detect_dictionary_words("Zx9$kL@mQ") == []

    def test_common_substitutions_detection(self):
        """Test detection of simple l33t speak substitutions"""
        analyzer = PasswordStrengthAnalyzer()
        
        # Common substitutions that result in weak passwords
        assert analyzer._detect_common_substitutions("p@ssw0rd") == [PasswordWeakness.COMMON_SUBSTITUTIONS]
        assert analyzer._detect_common_substitutions("@dmin") == [PasswordWeakness.COMMON_SUBSTITUTIONS]
        
        # Substitutions that don't result in weak base words
        assert analyzer._detect_common_substitutions("MyS3cur3P@ss") == []
        
        # No substitutions
        assert analyzer._detect_common_substitutions("MySecurePass") == []

    def test_complexity_score_calculation(self):
        """Test overall complexity score calculation"""
        # Very weak password
        analysis = analyze_password_strength("123456")
        assert analysis.complexity_score < 30
        assert not analysis.is_strong
        
        # Moderate password
        analysis = analyze_password_strength("Password123")
        assert 30 <= analysis.complexity_score < 70
        
        # Strong password
        analysis = analyze_password_strength("MyV3ry$ecur3P@ssw0rd!")
        assert analysis.complexity_score >= 70
        assert analysis.is_strong

    def test_weakness_accumulation(self):
        """Test that multiple weaknesses are properly accumulated"""
        # Password with multiple weaknesses
        analysis = analyze_password_strength("password123")
        
        # Should detect multiple issues
        assert len(analysis.weaknesses) > 1
        assert PasswordWeakness.DICTIONARY_WORD in analysis.weaknesses
        assert PasswordWeakness.SEQUENTIAL_CHARS in analysis.weaknesses

    def test_suggestions_generation(self):
        """Test that appropriate suggestions are generated"""
        # Short password
        analysis = analyze_password_strength("abc")
        assert any("12 characters" in suggestion for suggestion in analysis.suggestions)
        
        # Keyboard pattern
        analysis = analyze_password_strength("qwerty123456")
        assert any("keyboard patterns" in suggestion for suggestion in analysis.suggestions)
        
        # Dictionary word
        analysis = analyze_password_strength("password")
        assert any("dictionary words" in suggestion for suggestion in analysis.suggestions)

    def test_pattern_penalty_calculation(self):
        """Test that pattern penalties are calculated correctly"""
        analyzer = PasswordStrengthAnalyzer()
        
        # Password with patterns should have higher penalty
        penalty_pattern = analyzer._calculate_pattern_penalty("qwerty123")
        penalty_random = analyzer._calculate_pattern_penalty("Zx9$kL@mQ")
        
        assert penalty_pattern > penalty_random
        assert 0 <= penalty_pattern <= 0.8  # Penalty is capped
        assert 0 <= penalty_random <= 0.8

    def test_edge_cases(self):
        """Test edge cases and boundary conditions"""
        # Empty password
        analysis = analyze_password_strength("")
        assert analysis.entropy_bits == 0.0
        assert analysis.complexity_score == 0
        assert not analysis.is_strong
        
        # Single character
        analysis = analyze_password_strength("a")
        assert analysis.entropy_bits > 0
        assert analysis.complexity_score < 20
        
        # Very long strong password
        long_password = "ThisIsAVeryLongAndSecurePasswordWithManyDifferentCharacters123!@#"
        analysis = analyze_password_strength(long_password)
        assert analysis.entropy_bits > 80
        assert analysis.complexity_score > 80

    def test_user_info_integration(self):
        """Test that user info can be passed without breaking analysis"""
        user_info = {"email": "user@example.com", "name": "John Doe"}
        
        # Should work with user info
        analysis = analyze_password_strength("MySecurePassword123!", user_info)
        assert isinstance(analysis, PasswordAnalysis)
        assert analysis.entropy_bits > 0
        
        # Should work without user info
        analysis_no_info = analyze_password_strength("MySecurePassword123!")
        assert isinstance(analysis_no_info, PasswordAnalysis)
        # Results should be similar (user info not yet implemented for personalization)
        assert abs(analysis.entropy_bits - analysis_no_info.entropy_bits) < 1


class TestPasswordAnalysisIntegration:
    """Test integration with the overall password validation system"""

    def test_analysis_structure(self):
        """Test that PasswordAnalysis contains all expected fields"""
        analysis = analyze_password_strength("TestPassword123!")
        
        # Check all fields are present and correct types
        assert isinstance(analysis.entropy_bits, float)
        assert isinstance(analysis.complexity_score, int)
        assert isinstance(analysis.weaknesses, list)
        assert isinstance(analysis.character_set_size, int)
        assert isinstance(analysis.suggestions, list)
        assert isinstance(analysis.is_strong, bool)
        
        # Check value ranges
        assert analysis.entropy_bits >= 0
        assert 0 <= analysis.complexity_score <= 100
        assert analysis.character_set_size > 0

    def test_real_world_passwords(self):
        """Test analysis of real-world password patterns"""
        # Common weak passwords
        weak_passwords = [
            "password123",
            "admin123",
            "letmein",
            "qwerty123",
            "123456789",
            "password!",
        ]
        
        for password in weak_passwords:
            analysis = analyze_password_strength(password)
            assert analysis.complexity_score < 60, f"Password '{password}' should be weak (score: {analysis.complexity_score})"
            assert not analysis.is_strong, f"Password '{password}' should not be strong"
            assert len(analysis.weaknesses) > 0, f"Password '{password}' should have weaknesses"
        
        # Strong passwords
        strong_passwords = [
            "MyV3ry$ecur3P@ssw0rd!",
            "Tr0ub4dor&3",
            "correct-horse-battery-staple-2023!",
            "UnbreakablePassword2024#$",
        ]
        
        for password in strong_passwords:
            analysis = analyze_password_strength(password)
            assert analysis.complexity_score >= 60, f"Password '{password}' should be reasonably strong"
            # Note: Some may not be "is_strong" due to specific weakness detection

    def test_entropy_consistency(self):
        """Test that entropy calculations are consistent and reasonable"""
        # Longer passwords should generally have more entropy
        short_analysis = analyze_password_strength("Abc123!")
        long_analysis = analyze_password_strength("MyLongerPasswordWith123!")
        
        assert long_analysis.entropy_bits > short_analysis.entropy_bits
        
        # More diverse character sets should have more entropy
        simple_analysis = analyze_password_strength("passwordpassword")
        complex_analysis = analyze_password_strength("P@ssW0rD!2024")
        
        assert complex_analysis.entropy_bits > simple_analysis.entropy_bits

    def test_weakness_priority(self):
        """Test that critical weaknesses are properly identified"""
        # Dictionary words should be flagged even in longer passwords
        analysis = analyze_password_strength("passwordwithmorestuff123!")
        assert PasswordWeakness.DICTIONARY_WORD in analysis.weaknesses
        
        # Keyboard patterns should be flagged
        analysis = analyze_password_strength("qwerty123456!")
        assert PasswordWeakness.KEYBOARD_PATTERN in analysis.weaknesses
        
        # Repetition should be flagged
        analysis = analyze_password_strength("aaaabbbb1234")
        assert PasswordWeakness.REPEATED_CHARS in analysis.weaknesses