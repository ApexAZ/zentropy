"""
Advanced Password Strength Analyzer

Provides comprehensive password strength analysis including:
- Entropy calculation based on character set diversity
- Common pattern detection (keyboard patterns, sequences, repetition)
- Dictionary word detection
- Overall complexity scoring

Security Principles:
- Defense in depth with multiple validation layers
- Clear, actionable feedback for users
- Configurable thresholds for different security requirements
"""

import math
import re
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class PasswordWeakness(Enum):
    """Types of password weaknesses that can be detected"""

    KEYBOARD_PATTERN = "keyboard_pattern"
    REPEATED_CHARS = "repeated_chars"
    SEQUENTIAL_CHARS = "sequential_chars"
    COMMON_SUBSTITUTIONS = "common_substitutions"
    LOW_ENTROPY = "low_entropy"
    TOO_SHORT = "too_short"
    DICTIONARY_WORD = "dictionary_word"


@dataclass
class PasswordAnalysis:
    """Results of password strength analysis"""

    entropy_bits: float
    complexity_score: int  # 0-100 scale
    weaknesses: List[PasswordWeakness]
    character_set_size: int
    suggestions: List[str]
    is_strong: bool


class PasswordStrengthAnalyzer:
    """Advanced password strength analysis with entropy and pattern detection"""

    # Common keyboard patterns (QWERTY layout)
    KEYBOARD_PATTERNS = [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
        "1234567890",
        "0987654321",
        "abcdefghijklmnopqrstuvwxyz",
        "qwerty",
        "asdf",
        "zxcv",
        "123456",
        "654321",
    ]

    # Common character sequences
    SEQUENCES = [
        "abc",
        "bcd",
        "cde",
        "def",
        "efg",
        "fgh",
        "ghi",
        "hij",
        "ijk",
        "jkl",
        "klm",
        "lmn",
        "mno",
        "nop",
        "opq",
        "pqr",
        "qrs",
        "rst",
        "stu",
        "tuv",
        "uvw",
        "vwx",
        "wxy",
        "xyz",
        "123",
        "234",
        "345",
        "456",
        "567",
        "678",
        "789",
        "890",
    ]

    # Common l33t speak substitutions
    COMMON_SUBSTITUTIONS = {
        "a": "@",
        "e": "3",
        "i": "1",
        "o": "0",
        "s": "$",
        "t": "7",
        "l": "1",
    }

    # Basic dictionary of extremely common passwords (subset for validation)
    WEAK_PASSWORDS = {
        "password",
        "123456",
        "password123",
        "admin",
        "letmein",
        "welcome",
        "monkey",
        "dragon",
        "pass",
        "master",
        "shadow",
        "login",
        "hello",
    }

    @classmethod
    def analyze_password(
        cls, password: str, user_info: Optional[Dict] = None
    ) -> PasswordAnalysis:
        """
        Perform comprehensive password strength analysis.

        Args:
            password: Password to analyze
            user_info: Optional user information for personalized analysis

        Returns:
            PasswordAnalysis with detailed strength metrics
        """
        analyzer = cls()

        # Calculate entropy and character set diversity
        entropy_bits = analyzer._calculate_entropy(password)
        char_set_size = analyzer._get_character_set_size(password)

        # Detect weaknesses
        weaknesses = []
        weaknesses.extend(analyzer._detect_keyboard_patterns(password))
        weaknesses.extend(analyzer._detect_repetition(password))
        weaknesses.extend(analyzer._detect_sequences(password))
        weaknesses.extend(analyzer._detect_dictionary_words(password))
        weaknesses.extend(analyzer._detect_common_substitutions(password))

        # Add entropy-based weakness
        if entropy_bits < 35:  # Threshold for weak entropy
            weaknesses.append(PasswordWeakness.LOW_ENTROPY)

        if len(password) < 8:
            weaknesses.append(PasswordWeakness.TOO_SHORT)

        # Calculate complexity score (0-100)
        complexity_score = analyzer._calculate_complexity_score(
            password, entropy_bits, char_set_size, weaknesses
        )

        # Generate suggestions
        suggestions = analyzer._generate_suggestions(weaknesses, password)

        # Determine if password is considered strong
        is_strong = complexity_score >= 70 and len(weaknesses) <= 1

        return PasswordAnalysis(
            entropy_bits=entropy_bits,
            complexity_score=complexity_score,
            weaknesses=weaknesses,
            character_set_size=char_set_size,
            suggestions=suggestions,
            is_strong=is_strong,
        )

    def _calculate_entropy(self, password: str) -> float:
        """
        Calculate password entropy in bits using Shannon entropy formula.

        Entropy = length * log2(character_set_size)

        This provides a theoretical upper bound. Real entropy may be lower
        due to patterns and predictability.
        """
        if not password:
            return 0.0

        char_set_size = self._get_character_set_size(password)

        # Base entropy calculation
        base_entropy = len(password) * math.log2(char_set_size)

        # Apply penalty for patterns and repetition
        pattern_penalty = self._calculate_pattern_penalty(password)

        # Ensure we don't go below 0
        adjusted_entropy = max(0, base_entropy * (1 - pattern_penalty))

        return round(adjusted_entropy, 2)

    def _get_character_set_size(self, password: str) -> int:
        """
        Determine the size of the character set used in the password.

        Character sets:
        - Lowercase: 26 characters
        - Uppercase: 26 characters
        - Digits: 10 characters
        - Special: ~32 common special characters
        """
        char_set_size = 0

        if re.search(r"[a-z]", password):
            char_set_size += 26
        if re.search(r"[A-Z]", password):
            char_set_size += 26
        if re.search(r"[0-9]", password):
            char_set_size += 10
        if re.search(r"[^a-zA-Z0-9]", password):
            char_set_size += 32  # Approximate count of common special chars

        return max(char_set_size, 1)  # Avoid division by zero

    def _detect_keyboard_patterns(self, password: str) -> List[PasswordWeakness]:
        """Detect common keyboard patterns like 'qwerty' or '123456'"""
        password_lower = password.lower()

        for pattern in self.KEYBOARD_PATTERNS:
            # Check forward and reverse patterns
            if pattern in password_lower or pattern[::-1] in password_lower:
                if len(pattern) >= 4:  # Only flag significant patterns
                    return [PasswordWeakness.KEYBOARD_PATTERN]

        return []

    def _detect_repetition(self, password: str) -> List[PasswordWeakness]:
        """Detect repeated characters or character groups"""
        # Check for repeated single characters (3+ times)
        if re.search(r"(.)\1{2,}", password):
            return [PasswordWeakness.REPEATED_CHARS]

        # Check for repeated character groups (2+ chars repeated 2+ times)
        if re.search(r"(.{2,})\1+", password):
            return [PasswordWeakness.REPEATED_CHARS]

        return []

    def _detect_sequences(self, password: str) -> List[PasswordWeakness]:
        """Detect sequential characters like 'abc' or '123'"""
        password_lower = password.lower()

        for sequence in self.SEQUENCES:
            # Check forward and reverse sequences
            if sequence in password_lower or sequence[::-1] in password_lower:
                return [PasswordWeakness.SEQUENTIAL_CHARS]

        # Check for numeric sequences
        for i in range(len(password) - 2):
            if password[i : i + 3].isdigit():
                chars = [int(c) for c in password[i : i + 3]]
                if (chars[1] == chars[0] + 1 and chars[2] == chars[1] + 1) or (
                    chars[1] == chars[0] - 1 and chars[2] == chars[1] - 1
                ):
                    return [PasswordWeakness.SEQUENTIAL_CHARS]

        return []

    def _detect_dictionary_words(self, password: str) -> List[PasswordWeakness]:
        """Detect common dictionary words"""
        password_lower = password.lower()

        # Check against weak password list
        if password_lower in self.WEAK_PASSWORDS:
            return [PasswordWeakness.DICTIONARY_WORD]

        # Check if password contains common weak words
        for weak_word in self.WEAK_PASSWORDS:
            if len(weak_word) >= 4 and weak_word in password_lower:
                return [PasswordWeakness.DICTIONARY_WORD]

        return []

    def _detect_common_substitutions(self, password: str) -> List[PasswordWeakness]:
        """Detect common l33t speak substitutions that don't add real security"""
        # Convert back from common substitutions
        unsubstituted = password.lower()
        substitution_count = 0

        for original, substitute in self.COMMON_SUBSTITUTIONS.items():
            if substitute in password:
                unsubstituted = unsubstituted.replace(substitute.lower(), original)
                substitution_count += 1

        # If we found substitutions and the result is a weak password
        if substitution_count > 0 and unsubstituted in self.WEAK_PASSWORDS:
            return [PasswordWeakness.COMMON_SUBSTITUTIONS]

        return []

    def _calculate_pattern_penalty(self, password: str) -> float:
        """
        Calculate penalty factor (0-1) based on detected patterns.

        Higher penalty means more predictable password.
        """
        penalty = 0.0

        # Repetition penalty
        if re.search(r"(.)\1{2,}", password):
            penalty += 0.3

        # Keyboard pattern penalty
        password_lower = password.lower()
        for pattern in self.KEYBOARD_PATTERNS:
            if pattern in password_lower and len(pattern) >= 4:
                penalty += 0.4
                break

        # Sequential pattern penalty
        for sequence in self.SEQUENCES:
            if sequence in password_lower:
                penalty += 0.2
                break

        # Dictionary word penalty
        if password_lower in self.WEAK_PASSWORDS:
            penalty += 0.5

        return min(penalty, 0.8)  # Cap penalty at 80%

    def _calculate_complexity_score(
        self,
        password: str,
        entropy_bits: float,
        char_set_size: int,
        weaknesses: List[PasswordWeakness],
    ) -> int:
        """
        Calculate overall complexity score (0-100).

        Factors:
        - Entropy (40% weight)
        - Length (20% weight)
        - Character diversity (20% weight)
        - Weakness penalty (20% weight)
        """
        # Handle empty password
        if not password:
            return 0

        # Entropy score (0-40 points)
        entropy_score = min(40, (entropy_bits / 80) * 40)

        # Length score (0-20 points)
        length_score = min(20, (len(password) / 16) * 20)

        # Character diversity score (0-20 points)
        diversity_score = min(20, (char_set_size / 94) * 20)  # 94 = all printable ASCII

        # Weakness penalty - more severe for critical weaknesses
        weakness_penalty = 0
        for weakness in weaknesses:
            if weakness == PasswordWeakness.DICTIONARY_WORD:
                weakness_penalty += 15  # Heavy penalty for dictionary words
            elif weakness == PasswordWeakness.KEYBOARD_PATTERN:
                weakness_penalty += 12  # Heavy penalty for keyboard patterns
            elif weakness == PasswordWeakness.TOO_SHORT:
                weakness_penalty += 10  # Significant penalty for short passwords
            else:
                weakness_penalty += 4  # Standard penalty for other weaknesses

        weakness_score = max(0, 20 - weakness_penalty)

        total_score = entropy_score + length_score + diversity_score + weakness_score

        return int(round(total_score))

    def _generate_suggestions(
        self, weaknesses: List[PasswordWeakness], password: str
    ) -> List[str]:
        """Generate actionable suggestions based on detected weaknesses"""
        suggestions = []

        if PasswordWeakness.TOO_SHORT in weaknesses:
            suggestions.append("Use at least 12 characters for better security")

        if PasswordWeakness.LOW_ENTROPY in weaknesses:
            suggestions.append(
                "Add more character variety (uppercase, lowercase, numbers, symbols)"
            )

        if PasswordWeakness.KEYBOARD_PATTERN in weaknesses:
            suggestions.append("Avoid keyboard patterns like 'qwerty' or '123456'")

        if PasswordWeakness.REPEATED_CHARS in weaknesses:
            suggestions.append("Avoid repeating the same characters or sequences")

        if PasswordWeakness.SEQUENTIAL_CHARS in weaknesses:
            suggestions.append("Avoid sequential patterns like 'abc' or '123'")

        if PasswordWeakness.DICTIONARY_WORD in weaknesses:
            suggestions.append("Avoid common dictionary words and phrases")

        if PasswordWeakness.COMMON_SUBSTITUTIONS in weaknesses:
            suggestions.append(
                "Simple substitutions (@ for a) don't significantly improve security"
            )

        if not suggestions:
            suggestions.append("Your password meets basic security requirements")

        return suggestions


def analyze_password_strength(
    password: str, user_info: Optional[Dict] = None
) -> PasswordAnalysis:
    """
    Convenience function for password strength analysis.

    Args:
        password: Password to analyze
        user_info: Optional user context for personalized analysis

    Returns:
        PasswordAnalysis with comprehensive strength metrics
    """
    return PasswordStrengthAnalyzer.analyze_password(password, user_info)
