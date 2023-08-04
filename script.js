'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }
    _setDescription() {
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}


class Running extends Workout {
    type = 'running';
    
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this._setDescription();
        this.pace = duration / distance;  // min/km
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        // this.type = 'cycling';
        this._setDescription();
        this.speed = distance / (duration / 60); // km/h
    }
}


class App {
    #map;
    #mapEvent;
    #mapZoomLevel = 15;
    #workouts = [];

    constructor() {
        // Get user's position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Handling form submission
        form.addEventListener('submit', this._newWorkout.bind(this));

        // Toggle elevation/cadence field
        inputType.addEventListener('change', this._toggleElevationField);

        // Move to marker on click
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        if(navigator.geolocation) { // It will be undefined if the browser doesn't support it 
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                function () {
                    alert('Could not get your position');
                }
            );
        }
    }

    _loadMap(position) {
        const {latitude, longitude} = position.coords;
        console.log(`https://www.google.com/maps/@${latitude},${longitude}`)

        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        // This is the API key for the map
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Handling clicks on map
        this.#map.on('click', this._showForm.bind(this));

    
        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        }
        );
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }   

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        // Check if data is positive number
        const allPosNums = (...inputs) => inputs.every(i => Number.isFinite(i) && Number(i) > 0);
        e.preventDefault();

        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        
        if(!allPosNums(distance, duration) || (type === 'running' && !allPosNums(+inputCadence.value)) ) {

            return alert('Inputs have to be positive numbers!');

        }

        const workout = type === 'running' ? new Running([lat, lng], distance, duration, +inputCadence.value) : new Cycling([lat, lng], distance, duration, +inputElevation.value);
                
        this.#workouts.push(workout);
        this._renderWorkoutMarker(workout); // Render workout on map as marker
        this._renderWorkout(workout);   // Render workout on list
        this._hideForm();   // Hide form + clear input fields
        this._setLocalStorage();    // Set local storage to all workouts
        
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️': '🚴‍♀️'} </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
            </div>
        `;
        if(workout.type === 'running') {
            html += `
                <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(2)}</span>
                <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
                </div>
            </li>
            `;
        } else {
            html += `
                <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(2)}</span>
                <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
                </div>
            </li>
            `;
        }
        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        
        // closest() is like querySelector() but it starts from the element itself and then goes up the DOM tree
        // it returns the closest ancestor of the current element (or the current element itself) which matches the selectors given in parameter
        const workoutEl = e.target.closest('.workout'); 

        // If map is not defined or there is no workout element, return
        if(!this.#map || !workoutEl) return;

        const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);

        // Move to the workout's marker
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            }
        });
    }

    _setLocalStorage() {
        //* localStorage only stores strings, so we need to convert the array to a string
        //. setItem(<key>, <value>) sets the value to the key, overwriting the previous value if there was one from a previous session
        //.                         but adding it to the array if there was a previous value from the same session 
        //. JSON.stringify(<value>) converts the value to a string
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        //. getItem(<key>) returns the value of the key
        //. JSON.parse(<value>) converts the value to an array
        const data = JSON.parse(localStorage.getItem('workouts'));

        if(!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }

    // Reset local storage
    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}



const app = new App();

