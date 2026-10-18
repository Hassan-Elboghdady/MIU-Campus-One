(function () {
  var PHOTO_KEY = 'campusone_profile_photos';

  function getPhotos() {
    try {
      return JSON.parse(localStorage.getItem(PHOTO_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function getPhoto(email) {
    if (!email) return '';
    return getPhotos()[email.toLowerCase()] || '';
  }

  function initialsFor(user) {
    return (user.name || '?').trim().split(/\s+/).map(function (word) {
      return word[0];
    }).slice(0, 2).join('').toUpperCase();
  }

  function setAvatar(container, photo, initials, alt) {
    if (!container) return;
    var text = container.querySelector('.avatar-initials, #avatar-big-initials');
    var image = container.querySelector('img[data-profile-photo]');

    if (photo) {
      if (!image) {
        image = document.createElement('img');
        image.setAttribute('data-profile-photo', '');
        image.alt = alt || '';
        container.insertBefore(image, container.firstChild);
      }
      image.src = photo;
      image.style.display = 'block';
      image.style.width = '100%';
      image.style.height = '100%';
      image.style.objectFit = 'cover';
      image.style.borderRadius = '50%';
      if (text) text.style.display = 'none';
    } else {
      if (image) image.style.display = 'none';
      if (text) {
        text.textContent = initials;
        text.style.display = '';
      }
    }
  }

  function render(user) {
    if (!user) return;
    var photo = getPhoto(user.email);
    var initials = initialsFor(user);
    document.querySelectorAll('.profile-trigger__avatar').forEach(function (avatar) {
      setAvatar(avatar, photo, initials, '');
    });
    setAvatar(document.getElementById('avatar-circle'), photo, initials, user.name || 'Profile photo');
    var removeButton = document.getElementById('avatar-remove-btn');
    if (removeButton) removeButton.hidden = !photo;
  }

  function showError(message) {
    var error = document.getElementById('avatar-error');
    if (error) {
      error.textContent = message;
      error.classList.add('is-visible');
      error.classList.add('is-error');
      error.classList.remove('is-success');
    }
  }

  function removePhoto(user) {
    try {
      var photos = getPhotos();
      delete photos[user.email.toLowerCase()];
      localStorage.setItem(PHOTO_KEY, JSON.stringify(photos));
      render(user);
      var status = document.getElementById('avatar-error');
      if (status) {
        status.textContent = 'Profile photo removed.';
        status.classList.add('is-visible', 'is-success');
        status.classList.remove('is-error');
      }
    } catch (error) {
      showError('Could not remove your photo. Please try again.');
    }
  }

  window.CampusOneAvatar = { render: render };

  function savePhoto(file, user) {
    if (!file.type || file.type.indexOf('image/') !== 0) {
      showError('Choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('Choose an image smaller than 5 MB.');
      return;
    }

    var reader = new FileReader();
    reader.onerror = function () {
      showError('Could not read that image. Please try another file.');
    };
    reader.onload = function () {
      var image = new Image();
      image.onerror = function () {
        showError('That image could not be opened. Please try another file.');
      };
      image.onload = function () {
        var scale = Math.min(1, 512 / Math.max(image.width, image.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (!blob) {
            showError('Could not process that image. Please try another file.');
            return;
          }
          var compressed = new FileReader();
          compressed.onerror = function () {
            showError('Could not save that image. Please try again.');
          };
          compressed.onload = function () {
            try {
              var photos = getPhotos();
              photos[user.email.toLowerCase()] = compressed.result;
              localStorage.setItem(PHOTO_KEY, JSON.stringify(photos));
              var error = document.getElementById('avatar-error');
              if (error) {
                error.textContent = 'Profile photo updated.';
                error.classList.add('is-visible');
                error.classList.add('is-success');
                error.classList.remove('is-error');
              }
              render(user);
            } catch (error) {
              showError('Could not save your photo in this browser. Try a smaller image or free storage space.');
            }
          };
          compressed.readAsDataURL(blob);
        }, 'image/jpeg', 0.82);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function init() {
    var user;
    try {
      user = JSON.parse(localStorage.getItem('campusone_session') || 'null');
    } catch (error) {
      user = null;
    }
    if (!user) return;

    render(user);
    var removeButton = document.getElementById('avatar-remove-btn');
    if (removeButton) {
      removeButton.addEventListener('click', function () {
        removePhoto(user);
      });
    }
    var input = document.getElementById('avatar-file-input');
    if (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        var error = document.getElementById('avatar-error');
        if (error) {
          error.textContent = '';
          error.classList.remove('is-visible');
          error.classList.remove('is-error', 'is-success');
        }
        if (file) savePhoto(file, user);
        input.value = '';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('storage', function (event) {
    if (event.key !== PHOTO_KEY && event.key !== 'campusone_session') return;
    var user;
    try {
      user = JSON.parse(localStorage.getItem('campusone_session') || 'null');
    } catch (error) {
      user = null;
    }
    render(user);
  });
})();
