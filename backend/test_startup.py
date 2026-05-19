import traceback
try:
    import main
except Exception as e:
    with open('trace.txt', 'w') as f:
        traceback.print_exc(file=f)
    print("Wrote trace.txt")
