(function () {
  var devtoolsOpen = false;
  const element = new Image();
  Object.defineProperty(element, 'id', {
      get: function () {
          devtoolsOpen = true;
          alert('Developer Tools are open!');
      }
  });
  setInterval(function () {
      devtoolsOpen = false;
      console.log('%c', element);
  }, 1000);

  setInterval(function () {
      if (devtoolsOpen) {
          alert('Please close the developer tools.');
          window.location.href = 'https://cnpxdev.com';
      }
  }, 500);
  document.addEventListener('keydown', function (event) {
      if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && event.key === 'I')) {
          event.preventDefault();
          alert('You cannot open the developer tools.');
      }
      if (event.ctrlKey && event.key === 'U') {
          event.preventDefault();
          alert('Viewing source is disabled.');
      }
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
          event.preventDefault();
          alert('Inspecting elements is disabled.');
      }
  });
  document.addEventListener('contextmenu', function (event) {
      event.preventDefault();
      alert('Right-click is disabled.');
  });
})();
