import os
import json

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

from humanfriendly import format_timespan
from dotenv import load_dotenv

load_dotenv()

WORKFLOW = os.getenv('GITHUB_WORKFLOW')
STATUS = os.getenv('GITHUB_WORKFLOW_STATUS')
BRANCH = os.getenv('GITHUB_BRANCH')

# this sets up the Matplotlib interactive windows, use in ipynb
# %matplotlib widget

x = json.load(open('data/test-durations.json', 'rb'))
x.reverse()

plt.plot(range(len(x)), list(map(lambda v: v/60, x)), marker='o')
plt.xlabel('Test Run #')
plt.ylabel('Duration')
plt.title(f'{WORKFLOW}.yml ({STATUS} runs on {BRANCH})')
plt.grid(True)

# Add a vertical line on the events you want to highlight
plt.axvline(x = 0, color = 'r', linestyle='dashed', label = 'Significant event')

# Adjust ticks to readable format
ax = plt.gca()
ax.yaxis.set_major_locator(ticker.MultipleLocator(30))
tick_formatter = lambda x, pos: format_timespan(x*60).replace(" minutes", "m").replace(" hours", "h").replace(" hour", "h").replace("and ", "")
ax.yaxis.set_major_formatter(plt.FuncFormatter(tick_formatter))

plt.show()