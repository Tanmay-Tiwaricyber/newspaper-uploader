function startTimer(seconds) {
    let count = seconds;
    const countdown = document.getElementById('countdown');
    const btn = document.getElementById('download-btn');
    const timerDiv = document.getElementById('timer');
    const interval = setInterval(() => {
      count--;
      countdown.textContent = count;
      if (count <= 0) {
        clearInterval(interval);
        timerDiv.style.display = 'none';
        btn.style.display = 'block';
      }
    }, 1000);
  }