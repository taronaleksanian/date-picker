const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const VIEWS = { YEAR: "year", MONTH: "month" };
const CONTROLS = { PREV: "prev", NEXT: "next" };
const ERROR_MESSAGES = {
  ERROR_START_DATE_EXCEEDS_END_DATE:
    "Дата начала периода превышает дату окончания",
  ERROR_DATE_NOT_LATER_THAN_TODAY: "Выберите дату не позднее сегодняшнего дня",
  ERROR_APPLICANT_AGE_TOO_YOUNG:
    "Возраст соискателя должен быть не менее 14 лет",
};

const controlHandlers = {
  [VIEWS.MONTH]: {
    [CONTROLS.PREV]: goPrevMonth,
    [CONTROLS.NEXT]: goNextMonth,
  },
  [VIEWS.YEAR]: {
    [CONTROLS.PREV]: goPrevYear,
    [CONTROLS.NEXT]: goNextYear,
  },
};

const mountHandlers = {
  [VIEWS.YEAR]: (dateInput) => {
    const acceptButton = dateInput.querySelector(
      ".yearView .actions__btn.accept"
    );
    generateYearsView(dateInput, "20");
    setElementDisabledState(acceptButton, true);
  },
  [VIEWS.MONTH]: (dateInput) => {
    generateMonthView(dateInput);
  },
};

function onLoad() {
  const endDateInputs = document.querySelectorAll(
    'input[data-date-type="end"]'
  );

  if (!endDateInputs) return;

  endDateInputs.forEach((input) => {
    const dateButton = input.nextElementSibling;
    const inputName = input.getAttribute("name");

    selectDateAndSave(inputName, Date.now());

    checkSideEffects(dateButton);
  });
}

function checkIsDatePickerElement(wrapper, target) {
  return (
    (target.tagName === "TD" && target.hasAttribute("data-value")) ||
    wrapper.contains(target)
  );
}

function createOutsideClickHandler() {
  let handler;
  return function () {
    if (typeof handler === "function") {
      window.removeEventListener("click", handler);
    }

    const datePickerWrappers = document.querySelectorAll(".dateInput__wrapper");
    handler = (e) => {
      const target = e.target;

      datePickerWrappers.forEach((wrapper) => {
        if (checkIsDatePickerElement(wrapper, target)) return;

        const dateButtons = wrapper.querySelectorAll(".dateInput");

        dateButtons.forEach((dateButton) => {
          dateButton.removeAttribute("data-open");
        });
      });
    };
    window.addEventListener("click", handler);
  };
}

const handleOutsideClick = createOutsideClickHandler();

function attachEvents() {
  const datePickers = document.querySelectorAll(".dateInput");
  const controlButtons = document.querySelectorAll(
    ".pickerItem__button.controls"
  );
  const actionButtons = document.querySelectorAll(
    ".calendarActions .actions__btn"
  );

  if (!datePickers) return;

  datePickers.forEach((picker) => {
    picker.addEventListener("click", (e) => {
      handleDateInputClick(picker);
    });
    const monthButtons = picker.querySelectorAll(".month__button");
    const yearViewActionButtons = picker.querySelectorAll(
      ".yearView .actions__btn"
    );
    const clearButton = picker.querySelector(".clear-button");
    clearButton.addEventListener("click", (e) => {
      e.stopPropagation();
      handleDateInputClear(picker);
    });

    monthButtons.forEach((monthButton) => {
      monthButton.addEventListener("click", (e) =>
        handleSelectMonth(monthButton, picker)
      );
    });

    yearViewActionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.classList.contains("accept")) {
          handleAcceptYear(picker);
        } else {
          handleCancelYear(picker);
        }
      });
    });
  });

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("accept")) {
        handleSaveChanges(button);
      } else {
        handleResetChanges(button);
      }
    });
  });

  controlButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      handleControlButtonClick(button);
    });
  });

  handleOutsideClick();
}

function viewsHandler() {
  const pickerItems = document.querySelectorAll(".pickerItem");

  if (!pickerItems) return;

  pickerItems.forEach((item) => {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-view");
      const dateInput = item.parentNode.parentNode;

      if (dateInput.hasAttribute("data-active-view")) {
        dateInput.removeAttribute("data-active-view");
        return;
      }

      dateInput.setAttribute("data-active-view", view);
      mountHandlers[view](dateInput);
    });
  });
}

document.body.onload = function () {
  onLoad();
  attachEvents();
  viewsHandler();
  yearsViewFilterHandler();
};

/************* USER ACTIONS ************/

function handleDateInputClick(dateInput) {
  dateInput.setAttribute("data-open", true);
}

function handleDateInputClear(dateButton) {
  const wrapper = dateButton.parentNode;
  const input = dateButton.previousElementSibling;
  input.value = "";
  const yearViewElement = getViewElement(dateButton, "year");
  const monthViewElement = getViewElement(dateButton, "month");
  const valueElement = getValueElement(dateButton);

  yearViewElement.removeAttribute("data-value");
  monthViewElement.removeAttribute("data-value");

  dateButton.removeAttribute("data-year");
  dateButton.removeAttribute("data-month");
  dateButton.removeAttribute("data-active-year");
  dateButton.removeAttribute("data-active-month");
  dateButton.removeAttribute("data-day");
  dateButton.removeAttribute("data-active-view");
  dateButton.removeAttribute("data-open");
  dateButton.removeAttribute("data-has-changes");

  valueElement.removeAttribute("data-numeric-value");
  valueElement.removeAttribute("data-text-value");
  checkValidity(wrapper);
}

function handleFilterYear(input) {
  const searchValue = input.value;
  const acceptButton = input.parentNode.querySelector(".actions__btn.accept");

  const dateInput = input.parentNode.parentNode.parentNode;
  const isValidInput = /^(19[0-9]{2}|2[0-9]{3})$/.test(searchValue);

  setElementDisabledState(acceptButton, !isValidInput);
  generateYearsView(dateInput, searchValue);
}

function handleSelectYear(yearBtn, dateInput) {
  const value = yearBtn.getAttribute("data-value");
  dateInput.removeAttribute("data-active-view");
  setYear(dateInput, value);
}

function handleSelectMonth(monthBtn, dateInput) {
  const value = Number(monthBtn.getAttribute("data-value"));
  dateInput.removeAttribute("data-active-view");
  setMonth(dateInput, value);
}

function handleSelectDate(dateElement) {
  const value = Number(dateElement.getAttribute("data-value"));
  const dateInput =
    dateElement.parentNode.parentNode.parentNode.parentNode.parentNode
      .parentNode;
  const name = dateInput.previousElementSibling.getAttribute("name");

  selectDate(name, value);

  dateInput.removeAttribute("data-active-view");
  generateMonthView(dateInput);
  checkSideEffects(dateInput);
}

function handleControlButtonClick(button) {
  const dateInput = button.parentNode.parentNode.parentNode;
  const view = button.parentNode.getAttribute("data-view");
  const viewElement = getViewElement(dateInput, view);
  const control = button.classList.contains("next")
    ? CONTROLS.NEXT
    : CONTROLS.PREV;

  controlHandlers[view][control](dateInput, viewElement);
}

function goPrevYear(dateInput, viewElement) {
  const currentValue = Number(viewElement.getAttribute("data-value"));
  setYear(dateInput, currentValue - 1);
}

function goNextYear(dateInput, viewElement) {
  const currentValue = Number(viewElement.getAttribute("data-value"));
  setYear(dateInput, currentValue + 1);
}

function goPrevMonth(dateInput, viewElement) {
  const currentValue = viewElement.getAttribute("data-value");
  const currentIndex = MONTHS.findIndex(
    (month) => month.toLowerCase() === currentValue.toLowerCase()
  );

  setMonth(dateInput, currentIndex - 1);
}

function goNextMonth(dateInput, viewElement) {
  const currentValue = viewElement.getAttribute("data-value");
  const currentIndex = MONTHS.findIndex(
    (month) => month.toLowerCase() === currentValue.toLowerCase()
  );

  setMonth(dateInput, currentIndex + 1);
}

function handleSaveChanges(saveButton) {
  const wrapper = saveButton.parentNode.parentNode.previousElementSibling;
  const inputs = wrapper.querySelectorAll("input[data-date-type]");
  inputs.forEach((input) => {
    const dateInput = input.nextElementSibling;
    const name = input.getAttribute("name");
    saveChanges(name);
    dateInput.removeAttribute("data-open");
  });
}

function handleResetChanges(saveButton) {
  const wrapper = saveButton.parentNode.parentNode.previousElementSibling;
  const inputs = wrapper.querySelectorAll("input[data-date-type]");
  inputs.forEach((input) => {
    const dateInput = input.nextElementSibling;
    const previousDate = input.value;
    const name = input.getAttribute("name");

    if (checkIsValidInteger(previousDate)) {
      selectDate(name, Number(previousDate));
      dateInput.removeAttribute("data-open");
    }
  });
}
/************* END USER ACTIONS ************/

/************* SIDE EFFECTS ************/

function checkApplyButtonState(dateInput) {
  const selectedTime = getTimestampFromDateInput(dateInput);
  const savedValue = dateInput.previousElementSibling.value;
  const acceptButton = dateInput.parentNode.parentNode.querySelector(
    ".calendarActions .actions__btn.accept"
  );
  let isDisabled;
  if (!checkIsValidInteger(savedValue) || !selectedTime) {
    isDisabled = false;
  } else {
    const savedTime = Number(savedValue);
    if (!selectedTime || !savedTime) {
      isDisabled = true;
    } else {
      isDisabled = selectedTime === savedTime;
    }
  }

  setElementDisabledState(acceptButton, isDisabled);
}

function checkYearAcceptButtonState(searchInput) {}

function checkYearControlButtonsState(dateInput) {
  const yearViewElement = getViewElement(dateInput, "year");
  const nextButton = yearViewElement.parentNode.nextElementSibling;
  const selectedYear = Number(yearViewElement.getAttribute("data-value"));
  const currentYear = new Date().getFullYear();

  if (selectedYear === currentYear) {
    nextButton.setAttribute("disabled", true);
  } else {
    nextButton.removeAttribute("disabled");
  }
}

function checkMonthControlButtonsState(dateInput) {
  const monthViewElement = getViewElement(dateInput, "month");
  const prevButton = monthViewElement.parentNode.previousElementSibling;
  const nextButton = monthViewElement.parentNode.nextElementSibling;
  const selectedMonth = monthViewElement.getAttribute("data-value");
  if (!selectedMonth) return;
  const currentIndex = MONTHS.findIndex(
    (month) => month.toLowerCase() === selectedMonth.toLowerCase()
  );

  if (currentIndex === 0) {
    prevButton.setAttribute("disabled", true);
  } else {
    prevButton.removeAttribute("disabled");
  }

  if (currentIndex === 11) {
    nextButton.setAttribute("disabled", true);
  } else {
    nextButton.removeAttribute("disabled");
  }
}

function checkSideEffects(dateInput) {
  checkApplyButtonState(dateInput);
  checkYearControlButtonsState(dateInput);
  checkMonthControlButtonsState(dateInput);

  const dateInputs = dateInput.parentNode.querySelectorAll(".dateInput");

  dateInputs.forEach((input) => {
    generateMonthView(input);
  });
}

function checkValidity(dateInputWrapper) {
  const startInputValue = dateInputWrapper.querySelector(
    'input[data-date-type="start"]'
  ).value;
  const endInputValue = dateInputWrapper.querySelector(
    'input[data-date-type="end"]'
  ).value;
  const errorContainerElement =
    dateInputWrapper.parentNode.querySelector(".errorContainer");

  if (
    !checkIsValidInteger(startInputValue) ||
    !checkIsValidInteger(endInputValue)
  ) {
    errorContainerElement.textContent = "";
    return;
  }

  const startTime = Number(startInputValue);
  const endTime = Number(endInputValue);
  const currentTime = Date.now();
  let errorMessage = "";

  if (endTime > currentTime) {
    errorMessage = ERROR_MESSAGES.ERROR_DATE_NOT_LATER_THAN_TODAY;
  } else if (startTime > endTime) {
    errorMessage = ERROR_MESSAGES.ERROR_START_DATE_EXCEEDS_END_DATE;
  } else {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (endDate.getFullYear() - startDate.getFullYear() < 14) {
      errorMessage = ERROR_MESSAGES.ERROR_APPLICANT_AGE_TOO_YOUNG;
    }
  }

  errorContainerElement.textContent = errorMessage;
}

/************* END SIDE EFFECTS ************/

/************* YEARS VIEW ************/

function handleAcceptYear(dateInput) {
  const searchInput = dateInput.querySelector(".yearView input");
  setYear(dateInput, Number(searchInput.value));
  searchInput.value = "";
  dateInput.removeAttribute("data-active-view");
}

function handleCancelYear(dateInput) {
  const searchInput = dateInput.querySelector(".yearView input");
  searchInput.value = "";
  dateInput.removeAttribute("data-active-view");
}
function generateYearsView(dateInput, search) {
  const yearsViewElement = dateInput.querySelector(".yearView__content");
  yearsViewElement.innerHTML = "";
  const years = filterYears(search);

  years.forEach((year) => {
    const yearBtn = document.createElement("button");
    yearBtn.classList.add("yearView__button");
    yearBtn.setAttribute("data-value", year);
    yearBtn.textContent = year;
    yearBtn.addEventListener("click", () =>
      handleSelectYear(yearBtn, dateInput)
    );
    yearsViewElement.appendChild(yearBtn);
  });
}

function setYear(dateInput, value) {
  const yearViewElement = getViewElement(dateInput, "year");

  dateInput.setAttribute("data-active-year", value);
  yearViewElement.setAttribute("data-value", value);

  checkSideEffects(dateInput);
}

function yearsViewFilterHandler() {
  const yearFilterInputs = document.querySelectorAll(".yearView input");

  if (!yearFilterInputs) return;

  yearFilterInputs.forEach((input) => {
    const debounceHandler = debounce(handleFilterYear.bind(null, input), 300);
    input.addEventListener("input", debounceHandler);
  });
}

/************* END YEARS VIEW ************/

/************* MONTH VIEW ************/

function setMonth(dateInput, value) {
  const monthViewElement = getViewElement(dateInput, "month");

  dateInput.setAttribute("data-active-month", value);
  monthViewElement.setAttribute("data-value", MONTHS[value]);

  checkSideEffects(dateInput);
}

function generateMonthView(dateInput) {
  const wrapperElement = dateInput.querySelector("tbody");
  const year = Number(dateInput.getAttribute("data-active-year"));
  const month = Number(dateInput.getAttribute("data-active-month"));
  const dateInputWrapper = dateInput.parentNode.parentNode;
  const dateInputName = dateInputWrapper.getAttribute("data-for");
  const dateRange = getRange(dateInputName);

  generateCalendar(wrapperElement, month, year, dateRange);
  setTimeout(() => {
    handleOutsideClick();
  }, 100);
}

function generateCalendar(
  wrapperElement,
  month = new Date().getMonth(),
  year = new Date().getFullYear(),
  currentRange = {}
) {
  wrapperElement.innerHTML = "";
  const { start, end } = currentRange;
  const resultMatrix = generateMonthMatrix(year, month);
  let colSpan = 0;
  for (let row of resultMatrix) {
    const tr = document.createElement("tr");
    for (let day of row) {
      if (colSpan === 0 && day === 0) {
        colSpan = 1;
        continue;
      }

      if (day === 0 && colSpan > 0) {
        colSpan++;
        continue;
      }

      if (day > 0 && colSpan > 0) {
        const td = document.createElement("td");
        td.setAttribute("colspan", colSpan);
        tr.appendChild(td);
        colSpan = 0;
      }

      const td = document.createElement("td");
      let className = "";
      if (start < day && end > day) {
        className = "secondary";
      } else if (start === day || end === day) {
        className = "primary";
      }

      const field = new Date(day).getDate();
      td.textContent = field;
      if (className) {
        td.classList.add(className);
      }
      td.setAttribute("data-value", day);
      td.addEventListener("click", () => handleSelectDate(td));
      tr.appendChild(td);
    }
    wrapperElement.appendChild(tr);
  }
}

function selectDate(name, value) {
  const date = new Date(value);
  const dateButton = document.querySelector(
    `input[name="${name}"] + .dateInput`
  );
  if (!dateButton) {
    return console.error(
      `Trying to select unknown date input with the name: ${name}`
    );
  }
  const yearViewElement = getViewElement(dateButton, "year");
  const monthViewElement = getViewElement(dateButton, "month");

  yearViewElement.setAttribute("data-value", date.getFullYear());
  monthViewElement.setAttribute("data-value", MONTHS[date.getMonth()]);

  dateButton.setAttribute("data-year", date.getFullYear());
  dateButton.setAttribute("data-month", date.getMonth());
  dateButton.setAttribute("data-active-year", date.getFullYear());
  dateButton.setAttribute("data-active-month", date.getMonth());
  dateButton.setAttribute("data-day", date.getDate());
  checkSideEffects(dateButton);
}

/************* END MONTH VIEW ************/

/************* UTILITY FUNCTIONS ************/
function formatDate(date) {
  const textDate = `${new Intl.DateTimeFormat("ru", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)}`.replace(/ г.$/, "");
  const numericDate = `${new Intl.DateTimeFormat("ru", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)}`.replace(/ г.$/, "");

  return { textDate, numericDate };
}

function checkIsValidInteger(str) {
  return /^-?\d+$/.test(str);
}

function saveChanges(name) {
  const input = document.querySelector(`input[name="${name}"]`);
  const dateButton = document.querySelector(
    `input[name="${name}"] + .dateInput`
  );
  const wrapper = dateButton.parentNode;
  const timestamp = getTimestampFromDateInput(dateButton);
  if (!timestamp) return;
  const date = new Date(timestamp);

  input.value = timestamp;

  const { numericDate, textDate } = formatDate(date);

  const valueElement = getValueElement(dateButton);
  valueElement.setAttribute("data-numeric-value", numericDate);
  valueElement.setAttribute("data-text-value", textDate);
  checkSideEffects(dateButton);
  checkValidity(wrapper);
}

function selectDateAndSave(name, value) {
  selectDate(name, value);
  saveChanges(name);
}

function getViewElement(dateButton, view) {
  return dateButton.querySelector(
    `.pickerItem[data-view="${view}"] .pickerItem__inner`
  );
}

function getValueElement(dateButton) {
  return dateButton.querySelector(".dateInput__value");
}

function filterYears(filterText = "20") {
  const MIN_DATE = 1996;
  const MAX_DATE = 2023;
  const LIMIT = 24;
  const result = [];

  for (let i = MAX_DATE; i > MIN_DATE - 1; i--) {
    if (String(i).includes(filterText)) {
      result.push(i);
    }

    if (result.length === LIMIT) {
      break;
    }
  }

  return result;
}

function generateMonthMatrix(year, month) {
  const date = new Date(year, month, 1);
  let currentCol = date.getDay() - 1;
  const matrix = Array(5)
    .fill()
    .map(() => Array(7).fill(0));

  for (let i = 0; i < matrix.length; i++) {
    while (currentCol < matrix[i].length) {
      matrix[i][currentCol] = date.getTime();
      date.setDate(date.getDate() + 1);
      if (date.getMonth() !== month) {
        break;
      }
      currentCol++;
    }
    currentCol = 0;
  }

  return matrix;
}

function debounce(func, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

function getTimestampFromDateInput(dateButton) {
  const year = Number(dateButton.getAttribute("data-year"));
  const month = Number(dateButton.getAttribute("data-month"));
  const day = Number(dateButton.getAttribute("data-day"));

  if (!year || !month || !day) {
    return false;
  }

  const date = new Date(year, month, day);

  return date.getTime();
}

function setElementDisabledState(element, isDisabled) {
  if (isDisabled) {
    element.setAttribute("disabled", true);
  } else {
    element.removeAttribute("disabled");
  }
}

function getRange(inputName) {
  const wrapperElement = document.querySelector(
    `.dateInput__wrapper[data-for="${inputName}"]`
  );
  const startDateInput = wrapperElement.querySelector(
    'input[data-date-type="start"] + .dateInput'
  );
  const endDateInput = wrapperElement.querySelector(
    'input[data-date-type="end"] + .dateInput'
  );

  const start = getTimestampFromDateInput(startDateInput);
  const end = getTimestampFromDateInput(endDateInput);

  return {
    start,
    end,
  };
}
/************* END UTILITY FUNCTIONS ************/
