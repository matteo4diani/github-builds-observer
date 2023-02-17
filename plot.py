import numpy as np
import matplotlib.pyplot as plt
import json

# this sets up the Matplotlib interactive windows, use in ipynb
# %matplotlib widget

# this changes the default date converter for better interactive plotting of dates:
plt.rcParams['date.converter'] = 'concise'

x = json.load(open('test-durations.json', 'rb'))
x.reverse()

plt.plot(range(len(x)), x, marker='o')
plt.xlabel('Test Run #')
plt.ylabel('Duration (seconds)')
plt.title('long-run.yml durations over time')
plt.grid(True)
plt.show()