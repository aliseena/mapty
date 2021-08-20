'use strict';
const form = document.querySelector('.form'),
  containerWorkouts = document.querySelector('.workouts'),
  inputType = document.querySelector('.form__input--type'),
  inputDistance = document.querySelector('.form__input--distance'),
  inputDuration = document.querySelector('.form__input--duration'),
  inputCadence = document.querySelector('.form__input--cadence'),
  inputElevation = document.querySelector('.form__input--elevation'),
  removeBtn = document.querySelector('.close'),
  locationMessage = document.querySelector('.location__warning'),
  clearAll = document.querySelector('.clearWorkouts'),
  sortBtn = document.querySelector('.sortWorkouts'),
  displayButton = document.querySelector('.display__button'),
  confirmationPopup = document.querySelector('.confirmation__popup');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-5);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  // displayCountry()
  _setDesciption() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.desciption = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence, city, country) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.city = city;
    this.country = country;
    this.calcPace();
    this._setDesciption();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain, city, country) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.city = city;
    this.country = country;
    this.calcSpeed();
    this._setDesciption();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  primaryCity;
  primaryCountry;
  #mapEvent;
  #workouts = [];
  #zoomLevel = 10;
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._removeWorkout.bind(this));
    clearAll.addEventListener('click', this._clearWorkouts);
    sortBtn.addEventListener('click', this._sortWorkouts.bind(this));
    confirmationPopup.addEventListener('click', this._confirmPopup);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          locationMessage.style.transform = 'translateY(0)';
          setTimeout(() => {
            locationMessage.style.transform = 'translateY(-10rem)';
          }, 2000);
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#zoomLevel);
    L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      // maxZoom: 10,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    // render on map
    this.#workouts.forEach(work => this._renderMarker(work));
    // set workout-buttons
    this._setDisplay();
    // show all map markers
    if (this.#workouts.length === 0) return;
    this._setBounds();
  }

  _setBounds() {
    const markerCoords = this.#workouts.map(workout => workout.coords);
    let markers = markerCoords.map(coord => L.marker(coord));
    const markersGroup = new L.featureGroup(markers);
    this.#map.fitBounds(markersGroup.getBounds());
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  // workout regions
  async getCountry() {
    try {
      const { lat, lng } = await this.#mapEvent.latlng;
      console.log(lat, lng);
      const resGeo = await fetch(
        `https://geocode.xyz/${lat},${lng}?geoit=json`
      );
      const dataGeo = await resGeo.json();
      return dataGeo;
    } catch (error) {
      console.log(error);
    }
  }

  _hideForm() {
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  async _newWorkout(e) {
    // validate data
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const positiveNumbers = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    // region setup

    const countryData = await this.getCountry();
    this.primaryCity = countryData.city;
    this.primaryCountry = countryData.country;

    setTimeout(() => {
      let workout;
      // if workout is cycling, create cycling object
      if (type === 'cycling') {
        const elevation = +inputElevation.value;
        if (
          !validInputs(distance, duration, elevation) ||
          !positiveNumbers(distance, duration)
        )
          return alert('Inputs must be positive numbers');
        workout = new Cycling(
          [lat, lng],
          distance,
          duration,
          elevation,
          this.primaryCity,
          this.primaryCountry
        );
      }
      // if workout is running, create running object
      if (type === 'running') {
        const cadence = +inputCadence.value;
        if (
          !validInputs(distance, duration, cadence) ||
          !positiveNumbers(distance, duration, cadence)
        )
          return alert('Inputs must be positive numbers');
        workout = new Running(
          [lat, lng],
          distance,
          duration,
          cadence,
          this.primaryCity,
          this.primaryCountry
        );
      }
      // add new object to workout array
      this.#workouts.push(workout);
      // render workout marker
      this._renderMarker(workout);
      // render workout
      this._renderWorkout(workout);
      // hide form
      this._hideForm();
      // set to local storage
      this._setToLocalStorage();
      // button display
      this._setDisplay();
      //set bounds
      this._setBounds();
    }, 2000);
  }

  _renderMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚵🏻‍♀️'}  ${workout.desciption} ${
          workout.city ? `in ${workout.city}` : ''
        }${workout.country ? `,${workout.country}` : ''}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.desciption} 

    </h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚵🏻‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === 'running')
      html += `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
  <button class="workout__remove" data-id= ${workout.id}>Remove</button>
  </li>
    `;
    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
          <button class="workout__remove" data-id= ${workout.id}>Remove</button>
          </li> 
    `;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToWorkout(e) {
    const element = e.target.closest('.workout');
    if (!element) return;
    const workout = this.#workouts.find(el => el.id === element.dataset.id);
    this.#map.setView(workout.coords, this.#zoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // workout.click();
  }
  _setToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkout(work));
  }
  _removeWorkout(e) {
    if (e.target.classList.contains('workout__remove')) {
      const domElementId = e.target.dataset.id;
      const index = this.#workouts.findIndex(item => item.id === domElementId);
      this.#workouts.splice(index, 1);
      this._setToLocalStorage();
      location.reload();
    }
  }
  _sortWorkouts() {
    const sorted = this.#workouts
      .slice()
      .sort((a, b) => a.distance - b.distance);
    while (containerWorkouts.childNodes.length > 2) {
      containerWorkouts.removeChild(containerWorkouts.lastChild);
    }
    sorted.forEach(workout => this._renderWorkout(workout));
  }
  _confirmPopup(e) {
    const button = e.target.closest('.delete');
    if (button.value === 'yes') localStorage.clear();
    if (button.value === 'no') {
      confirmationPopup.classList.remove('showConfirmation');
      return;
    }
    location.reload();
  }
  _clearWorkouts() {
    confirmationPopup.classList.add('showConfirmation');
  }
  _setDisplay() {
    if (this.#workouts.length >= 1) displayButton.style.display = 'flex';
    if (this.#workouts.length === 0) displayButton.style.display = 'none';
  }
}
const app = new App();

// const getPosition = function () {
//   return new Promise(function (resolve, reject) {
//     navigator.geolocation.getCurrentPosition(resolve, reject);
//   });
// };
// async function getCountry() {
//   try {
//     const pos = await getPosition();
//     const { latitude: lat, longitude: lng } = pos.coords;
//     const resGeo = await fetch(`https://geocode.xyz/${lat},${lng}?geoit=json`);
//     const dataGeo = await resGeo.json();
//     // return dataGeo;
//     console.log(dataGeo);
//   } catch (error) {
//     console.log(`we have a problem with ${error}`);
//   }
// }
// (async function () {
//   const countryData = await getCountry();
//   // console.log(countryData);
// })();
