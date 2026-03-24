import numpy as np
import traceback
import sys
from detection import analyze_frame

def test():
    # 2. Test analyze_frame with a dummy image
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    try:
        res = analyze_frame(frame)
        print("analyze_frame success:", res)
    except Exception as e:
        print("analyze_frame failed!")
        traceback.print_exc(file=sys.stdout)

if __name__ == "__main__":
    test()
