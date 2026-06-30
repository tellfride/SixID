def xlsx_safe(value):
    """Strip control characters that openpyxl/Excel cannot store in a cell.

    Hardware-reported strings (serials, BIOS strings, etc.) occasionally
    contain stray control bytes that crash IllegalCharacterError on write.
    """
    if not isinstance(value, str):
        return value
    return "".join(c for c in value if c in ("\n", "\t") or ord(c) >= 32)
