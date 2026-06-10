import tkinter as tk
from tkinter import filedialog,messagebox
from PIL import Image
import numpy as np

cover_path=""
secret_path=""

def select_cover():
    global cover_path
    cover_path=filedialog.askopenfilename()

def select_secret():
    global secret_path
    secret_path=filedialog.askopenfilename()

def hide_image():
    try:
        cover=Image.open(cover_path)
        secret=Image.open(secret_path)

        cover=cover.resize((300,300))
        secret=secret.resize((300,300))

        cover=np.array(cover)
        secret=np.array(secret)

        encoded=cover.copy()

        encoded[:,:,0]=(cover[:,:,0]&240)|(secret[:,:,0]>>4)
        encoded[:,:,1]=(cover[:,:,1]&240)|(secret[:,:,1]>>4)
        encoded[:,:,2]=(cover[:,:,2]&240)|(secret[:,:,2]>>4)

        Image.fromarray(encoded).save("encoded.png")

        messagebox.showinfo("Success","Image Hidden Successfully")

    except:
        messagebox.showerror("Error","Select Images First")

root=tk.Tk()
root.title("Image Steganography")

tk.Button(root,text="Select Cover Image",
command=select_cover).pack(pady=10)

tk.Button(root,text="Select Secret Image",
command=select_secret).pack(pady=10)

tk.Button(root,text="Hide Image",
command=hide_image).pack(pady=10)

root.mainloop()