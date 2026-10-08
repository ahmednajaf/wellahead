const result = new URLSearchParams(location.search).get('result');
document.getElementById('result').textContent = result === 'connected' ? 'Calendar connected' : 'Sign-in cancelled';
window.opener?.postMessage({ type: 'well-ahead-calendar', result }, location.origin);
document.getElementById('return').onclick = () => {
  if (window.opener) { window.opener.focus(); window.close(); }
  else location.href = '/';
};
