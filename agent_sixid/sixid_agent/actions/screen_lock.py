import ctypes
import logging
import threading
import tkinter as tk

logger = logging.getLogger("SixiDAgent")

_lock_window = None
_lock_thread = None


def lock_screen(message: str = "Seu computador foi bloqueado pela equipe de TI."):
    global _lock_window, _lock_thread

    if _lock_window is not None:
        return

    def _create_lock():
        global _lock_window
        root = tk.Tk()
        _lock_window = root

        root.attributes("-fullscreen", True)
        root.attributes("-topmost", True)
        root.configure(bg="#0B1220")
        root.overrideredirect(True)

        root.protocol("WM_DELETE_WINDOW", lambda: None)

        frame = tk.Frame(root, bg="#0B1220")
        frame.place(relx=0.5, rely=0.5, anchor="center")

        icon_label = tk.Label(frame, text="\U0001F512", font=("Segoe UI Emoji", 72), bg="#0B1220", fg="#FF4D4F")
        icon_label.pack(pady=(0, 20))

        title_label = tk.Label(
            frame, text="TELA BLOQUEADA",
            font=("Poppins", 36, "bold"), bg="#0B1220", fg="#FF4D4F",
        )
        title_label.pack(pady=(0, 30))

        msg_label = tk.Label(
            frame, text=message,
            font=("Poppins", 18), bg="#0B1220", fg="#E6EBF1",
            wraplength=800, justify="center",
        )
        msg_label.pack(pady=(0, 40))

        footer = tk.Label(
            frame, text="SixiD - Sistema de Gestão de Ativos e Inventário de TI",
            font=("Poppins", 12), bg="#0B1220", fg="#5B6470",
        )
        footer.pack()

        try:
            ctypes.windll.user32.BlockInput(True)
        except Exception:
            pass

        root.mainloop()

    _lock_thread = threading.Thread(target=_create_lock, daemon=True)
    _lock_thread.start()
    logger.info("Screen locked")


def unlock_screen():
    global _lock_window, _lock_thread

    if _lock_window is None:
        return

    try:
        ctypes.windll.user32.BlockInput(False)
    except Exception:
        pass

    try:
        _lock_window.after(0, _lock_window.destroy)
    except Exception:
        pass

    _lock_window = None
    _lock_thread = None
    logger.info("Screen unlocked")


def is_locked() -> bool:
    return _lock_window is not None
