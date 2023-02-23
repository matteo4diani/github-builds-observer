import os
import json
import datetime
from datetime import datetime, timedelta

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

data = json.load(open('data/test-durations.json', 'rb'))

plt.plot(range(len(data)), list(map(lambda v: v/60, data)), marker='o')
plt.xlabel('Date')
#plt.xlabel('Test Run #')
plt.ylabel('Duration')
plt.title(f'{WORKFLOW} ({STATUS} runs on {BRANCH})')
plt.grid(True)

# Add a vertical line on the events you want to highlight
plt.axvline(x = 132, color = 'r', linestyle='dashed', label = 'Significant event')
plt.axvline(x = 155, color = 'r', linestyle='dashed', label = 'Significant event')

# Adjust timescale
last_run_date = datetime(2023, 2, 23)

# Adjust ticks to readable format
ax = plt.gca()

ax.xaxis.set_major_locator(ticker.MultipleLocator(14))
ax.yaxis.set_major_locator(ticker.MultipleLocator(30))

xtick_formatter = lambda x, pos: (last_run_date - timedelta(days=(len(data) - x - 1))).strftime('%m/%d/%y')
ytick_formatter = lambda x, pos: format_timespan(x*60).replace(" minutes", "m").replace(" hours", "h").replace(" hour", "h").replace("and ", "")
ax.xaxis.set_major_formatter(plt.FuncFormatter(xtick_formatter))
ax.yaxis.set_major_formatter(plt.FuncFormatter(ytick_formatter))

plt.show()