document.addEventListener('DOMContentLoaded', function () {
	var introLayout = document.querySelector('.solr-search-intro-layout');
	var resultsLayout = document.querySelector('.solr-search-layout');
	var formPlugin = document.querySelector('.tx-solr-search-form-plugin');
	var resultsPlugin = document.querySelector('.tx-solr-search-results-plugin');
	var plannerWithResult = resultsLayout ? resultsLayout.querySelector('.tx-turqey-planner--has-result') : null;
	var inlinePlannerForm = resultsLayout ? resultsLayout.querySelector('.planner-widget-form[data-planner-inline="1"]') : null;

	if (!introLayout || !resultsLayout || !resultsPlugin) {
		return;
	}

	function showIntroLayout() {
		introLayout.style.display = '';
		resultsLayout.style.display = 'none';
	}

	function showResultsLayout() {
		introLayout.style.display = 'none';
		resultsLayout.style.display = '';
	}

	function cleanPlannerParamsFromUrl() {
		if (!window.history || !window.history.replaceState) {
			return;
		}

		var currentUrl = new URL(window.location.href);
		var keysToDelete = [];

		currentUrl.searchParams.forEach(function (_, key) {
			if (key.indexOf('tx_turqey_planner[') === 0 || key === 'cHash') {
				keysToDelete.push(key);
			}
		});

		if (!keysToDelete.length) {
			return;
		}

		keysToDelete.forEach(function (key) {
			currentUrl.searchParams.delete(key);
		});

		var nextUrl = currentUrl.pathname;
		if (currentUrl.searchParams.toString()) {
			nextUrl += '?' + currentUrl.searchParams.toString();
		}
		if (currentUrl.hash) {
			nextUrl += currentUrl.hash;
		}

		window.history.replaceState({}, '', nextUrl);
	}

	function getPlannerOptionText(select) {
		if (!select || select.selectedIndex < 0) {
			return '';
		}

		return select.options[select.selectedIndex].text;
	}

	function buildPlannerBudget(budget, weddingType, priority) {
		var allocation = [
			{ label: 'Venue', percent: 35 },
			{ label: 'Bridal wear and style', percent: 20 },
			{ label: 'Photography and video', percent: 12 },
			{ label: 'Music and entertainment', percent: 10 },
			{ label: 'Accessories and details', percent: 13 },
			{ label: 'Contingency fund', percent: 10 }
		];

		if (weddingType === 'nikah') {
			allocation[0].percent = 24;
			allocation[5].percent = 18;
		}

		if (priority === 'style') {
			allocation[1].percent = 28;
			allocation[0].percent = Math.max(18, allocation[0].percent - 8);
		}

		if (priority === 'budget') {
			allocation[5].percent = 18;
			allocation[4].percent = Math.max(8, allocation[4].percent - 5);
		}

		if (budget === 'low') {
			allocation[5].percent += 4;
			allocation[3].percent = Math.max(7, allocation[3].percent - 2);
		}

		if (budget === 'high') {
			allocation[2].percent += 4;
			allocation[4].percent += 3;
			allocation[5].percent = Math.max(7, allocation[5].percent - 5);
		}

		return allocation;
	}

	function buildPlannerSteps(cityLabel, weddingType, priority) {
		var steps = [];

		if (priority === 'venue') {
			steps.push(cityLabel + ' — shortlist three suitable venues and ask about available weekdays.');
			steps.push('Confirm your venue before finalizing invitations and seating arrangements.');
		} else if (priority === 'style') {
			steps.push('Choose your bridal style, then schedule hair and makeup trials.');
			steps.push('Include shoes, accessories and alterations in your bridal budget.');
		} else if (priority === 'media') {
			steps.push('Map out your wedding day and discuss natural light with your photography and video team.');
			steps.push('Check photo locations when you visit a venue.');
		} else {
			steps.push('Price your essential services before adding optional extras.');
			steps.push('Set aside at least 10% for unexpected costs and confirm bookings with written contracts.');
		}

		if (weddingType === 'kina-nikah') {
			steps.push('Decide whether to hold your rehearsal dinner and ceremony on separate days.');
		} else if (weddingType === 'nikah') {
			steps.push('Once your ceremony date is confirmed, plan a small celebration and photography together.');
		} else {
			steps.push('Confirm your guest count, then coordinate music, cake and seating in one plan.');
		}

		return steps.slice(0, 3);
	}

	function buildPlannerFocus(priority, weddingType) {
		if (priority === 'budget') {
			return 'Your focus is budget management. Cover essential costs before adding decorative details.';
		}

		if (priority === 'style') {
			return 'Your focus is a cohesive style. Coordinate your bridal wear, hair, makeup and accessories.';
		}

		if (weddingType === 'nikah') {
			return 'This plan keeps an intimate ceremony simple, with a few clear decisions.';
		}

		return 'Use this starting roadmap to focus your research and make decisions in a practical order.';
	}

	function renderPlannerResult(form) {
		var plannerCard = form.closest('.tx-turqey-planner');
		var resultHost = plannerCard ? plannerCard.querySelector('.planner-widget-result-host') : null;
		var city = form.querySelector('[name="tx_turqey_planner[city]"]');
		var budget = form.querySelector('[name="tx_turqey_planner[budget]"]');
		var guests = form.querySelector('[name="tx_turqey_planner[guests]"]');
		var weddingType = form.querySelector('[name="tx_turqey_planner[weddingType]"]');
		var priority = form.querySelector('[name="tx_turqey_planner[priority]"]');

		if (!plannerCard || !resultHost || !city || !budget || !guests || !weddingType || !priority) {
			return;
		}

		var cityValue = city.value || 'new-york';
		var budgetValue = budget.value || 'mid';
		var guestsValue = guests.value || 'medium';
		var weddingTypeValue = weddingType.value || 'dugun';
		var priorityValue = priority.value || 'venue';
		var cityLabel = getPlannerOptionText(city) || 'New York, NY';
		var budgetLabel = getPlannerOptionText(budget) || 'Mid-range budget';
		var guestsLabel = getPlannerOptionText(guests) || '80–180 guests';
		var typeLabel = getPlannerOptionText(weddingType) || 'Full wedding';
		var steps = buildPlannerSteps(cityLabel, weddingTypeValue, priorityValue);
		var budgetItems = buildPlannerBudget(budgetValue, weddingTypeValue, priorityValue);
		var budgetMarkup = budgetItems.map(function (item) {
			return '<li><span>' + item.label + '</span><b>' + item.percent + '%</b></li>';
		}).join('');
		var stepsMarkup = steps.map(function (step) {
			return '<li>' + step + '</li>';
		}).join('');

		resultHost.innerHTML = '' +
			'<div class="planner-widget-result">' +
				'<h4 class="planner-widget-result__title">Your wedding plan for ' + cityLabel + '</h4>' +
				'<p class="planner-widget-result__summary">A starting plan for ' + cityLabel + ': ' + budgetLabel + ', ' + guestsLabel + ', ' + typeLabel + '.</p>' +
				'<div class="planner-widget-result__focus">' + buildPlannerFocus(priorityValue, weddingTypeValue) + '</div>' +
				'<div class="planner-widget-result__section">' +
					'<strong>Next steps</strong>' +
					'<ul class="planner-widget-result__list">' + stepsMarkup + '</ul>' +
				'</div>' +
				'<div class="planner-widget-result__section">' +
					'<strong>Example budget breakdown</strong>' +
					'<ul class="planner-widget-budget list-unstyled mb-0">' + budgetMarkup + '</ul>' +
				'</div>' +
			'</div>';

		plannerCard.classList.add('tx-turqey-planner--has-result');
		plannerCard.setAttribute('data-planner-state', 'result');
		showResultsLayout();
		cleanPlannerParamsFromUrl();
	}

	var hasStandaloneForm = Boolean(formPlugin);
	var hasResults = resultsPlugin.classList.contains('tx-solr-search--results');
	var hasPlannerResult = Boolean(plannerWithResult);

	if (hasResults || hasPlannerResult) {
		showResultsLayout();
	} else if (hasStandaloneForm) {
		showIntroLayout();
	} else {
		resultsLayout.style.display = '';
	}

	if (inlinePlannerForm) {
		inlinePlannerForm.addEventListener('submit', function (event) {
			event.preventDefault();
			renderPlannerResult(inlinePlannerForm);
		});
	}

	cleanPlannerParamsFromUrl();
});

document.addEventListener('DOMContentLoaded', function () {
	var planners = document.querySelectorAll('[data-seating-planner]');

	if (!planners.length) {
		return;
	}

	function normalizeName(value) {
		return (value || '')
			.toLowerCase()
			.replace(/ı/g, 'i')
			.replace(/ğ/g, 'g')
			.replace(/ü/g, 'u')
			.replace(/ş/g, 's')
			.replace(/ö/g, 'o')
			.replace(/ç/g, 'c')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function normalizePreference(value) {
		var normalized = normalizeName(value);
		if (normalized === 'stage' || normalized === 'buhne' || normalized === 'sahne') {
			return 'stage';
		}
		if (normalized === 'aisle' || normalized === 'flur' || normalized === 'koridor') {
			return 'aisle';
		}
		return 'none';
	}

	function seatCountForLayout(layout) {
		if (layout === 'round-4') {
			return 4;
		}
		if (layout === 'round-5' || layout === 'row-5') {
			return 5;
		}
		if (layout === 'round-6') {
			return 6;
		}
		if (layout === 'row-10') {
			return 10;
		}
		return 8;
	}

	function parseGuests(text) {
		return text
			.split(/\n+/)
			.map(function (line, index) {
				var parts = line.split('|').map(function (item) {
					return item.trim();
				});
				var name = parts[0] || '';
				if (!name) {
					return null;
				}

				return {
					id: 'guest-' + index + '-' + normalizeName(name).replace(/[^a-z0-9]+/g, '-'),
					name: name,
					group: parts[1] || 'General',
					preference: normalizePreference(parts[2] || ''),
					seatId: null
				};
			})
			.filter(Boolean);
	}

	function buildGuestLookup(guests) {
		var lookup = {};
		guests.forEach(function (guest) {
			lookup[normalizeName(guest.name)] = guest.id;
		});
		return lookup;
	}

	function parseRuleLines(text, lookup) {
		return text
			.split(/\n+/)
			.map(function (line) {
				return line.split('|').map(function (item) {
					return item.trim();
				});
			})
			.filter(function (parts) {
				return parts[0] && parts[1];
			})
			.map(function (parts) {
				var leftId = lookup[normalizeName(parts[0])] || null;
				var rightId = lookup[normalizeName(parts[1])] || null;
				if (!leftId || !rightId || leftId === rightId) {
					return null;
				}

				return {
					leftId: leftId,
					rightId: rightId,
					leftName: parts[0],
					rightName: parts[1]
				};
			})
			.filter(Boolean);
	}

	function buildRuleMap(pairs) {
		var map = {};
		pairs.forEach(function (pair) {
			map[pair.leftId] = map[pair.leftId] || [];
			map[pair.rightId] = map[pair.rightId] || [];
			map[pair.leftId].push(pair.rightId);
			map[pair.rightId].push(pair.leftId);
		});
		return map;
	}

	function buildTables(configs, stageCount, aisleCount) {
		var remainingStage = stageCount;
		var remainingAisle = aisleCount;
		var tables = [];
		var tableNumber = 0;

		configs.forEach(function (config) {
			var seatsPerTable = seatCountForLayout(config.layout);

			for (var countIndex = 0; countIndex < config.count; countIndex += 1) {
				var seats = [];
				tableNumber += 1;

				for (var seatIndex = 0; seatIndex < seatsPerTable; seatIndex += 1) {
					var zone = 'normal';
					if (remainingStage > 0) {
						zone = 'stage';
						remainingStage -= 1;
					} else if (remainingAisle > 0) {
						zone = 'aisle';
						remainingAisle -= 1;
					}

					seats.push({
						id: 'table-' + tableNumber + '-seat-' + (seatIndex + 1),
						label: 'Seat ' + (seatIndex + 1),
						zone: zone,
						guestId: null
					});
				}

				tables.push({
					id: 'table-' + tableNumber,
					name: 'Table ' + tableNumber,
					layout: config.layout,
					seats: seats,
					configLabel: config.label,
					area: 'main',
					position: { x: 0, y: 0 },
					collapsed: false
				});
			}
		});

		return tables;
	}

	function getTableFootprint(table) {
		var isRowLayout = table.layout.indexOf('row') === 0;
		var seatCount = table.seats.length;

		return {
			width: isRowLayout ? 280 : (seatCount >= 6 ? 264 : 228),
			height: isRowLayout ? 188 : (seatCount >= 8 ? 352 : (seatCount >= 6 ? 332 : 276))
		};
	}

	function getAreaElement(root, areaName) {
		return root.querySelector(areaName === 'annex' ? '[data-seating-tables-annex]' : '[data-seating-tables-main]');
	}

	function getObjectAreaElement(root, areaName) {
		return root.querySelector(areaName === 'annex' ? '[data-seating-objects-annex]' : '[data-seating-objects-main]');
	}

	function getAreaMetrics(root, areaName) {
		var element = getAreaElement(root, areaName);
		var fallback = areaName === 'annex'
			? { width: 980, height: 330, paddingX: 24, paddingY: 16 }
			: { width: 1180, height: 760, paddingX: 16, paddingY: 16 };

		if (!element) {
			return fallback;
		}

		return {
			width: element.clientWidth || fallback.width,
			height: element.clientHeight || fallback.height,
			paddingX: fallback.paddingX,
			paddingY: fallback.paddingY
		};
	}

	function clampTablePosition(metrics, footprint, position) {
		var maxX = Math.max(metrics.paddingX, metrics.width - footprint.width - metrics.paddingX);
		var maxY = Math.max(metrics.paddingY, metrics.height - footprint.height - metrics.paddingY);

		return {
			x: Math.min(maxX, Math.max(metrics.paddingX, position.x)),
			y: Math.min(maxY, Math.max(metrics.paddingY, position.y))
		};
	}

	function buildInitialTablePosition(metrics, footprint, index, columns) {
		var gapX = 26;
		var gapY = 28;
		var column = index % columns;
		var row = Math.floor(index / columns);

		return clampTablePosition(metrics, footprint, {
			x: metrics.paddingX + column * (footprint.width + gapX),
			y: metrics.paddingY + row * (footprint.height + gapY)
		});
	}

	function seedTablePlacements(root, tables) {
		var mainMetrics = getAreaMetrics(root, 'main');
		var annexMetrics = getAreaMetrics(root, 'annex');
		var mainColumns = Math.max(1, Math.floor((mainMetrics.width - mainMetrics.paddingX * 2) / 330));
		var annexColumns = Math.max(1, Math.floor((annexMetrics.width - annexMetrics.paddingX * 2) / 320));
		var mainIndex = 0;
		var annexIndex = 0;

		tables.forEach(function (table, index) {
			var footprint = getTableFootprint(table);
			var areaName = index < 6 ? 'main' : 'annex';
			var areaIndex = areaName === 'main' ? mainIndex : annexIndex;
			var metrics = areaName === 'main' ? mainMetrics : annexMetrics;
			var columns = areaName === 'main' ? mainColumns : annexColumns;

			table.area = areaName;
			table.position = buildInitialTablePosition(metrics, footprint, areaIndex, columns);

			if (areaName === 'main') {
				mainIndex += 1;
			} else {
				annexIndex += 1;
			}
		});
	}

	function parseTableConfigs(root) {
		return Array.prototype.slice.call(root.querySelectorAll('[data-seating-config-row]'))
			.map(function (row) {
				var layoutSelect = row.querySelector('[data-seating-layout]');
				var countInput = row.querySelector('[data-seating-table-count]');
				var count = Math.max(0, parseInt(countInput.value, 10) || 0);
				return {
					layout: layoutSelect.value,
					label: layoutSelect.options[layoutSelect.selectedIndex] ? layoutSelect.options[layoutSelect.selectedIndex].text : layoutSelect.value,
					count: count
				};
			})
			.filter(function (config) {
				return config.layout && config.count > 0;
			});
	}

	function clearAssignments(state) {
		state.guests.forEach(function (guest) {
			guest.seatId = null;
		});
		state.tables.forEach(function (table) {
			table.seats.forEach(function (seat) {
				seat.guestId = null;
			});
		});
	}

	function findSeat(state, seatId) {
		for (var tableIndex = 0; tableIndex < state.tables.length; tableIndex += 1) {
			for (var seatIndex = 0; seatIndex < state.tables[tableIndex].seats.length; seatIndex += 1) {
				if (state.tables[tableIndex].seats[seatIndex].id === seatId) {
					return state.tables[tableIndex].seats[seatIndex];
				}
			}
		}
		return null;
	}

	function findGuest(state, guestId) {
		return state.guests.find(function (guest) {
			return guest.id === guestId;
		}) || null;
	}

	function getTableIdBySeatId(seatId) {
		return seatId ? seatId.split('-seat-')[0] : null;
	}

	function getTableById(state, tableId) {
		return state.tables.find(function (table) {
			return table.id === tableId;
		}) || null;
	}

	function getGuestTableId(guest) {
		return guest && guest.seatId ? getTableIdBySeatId(guest.seatId) : null;
	}

	function getGuestIdsAtTable(state, tableId) {
		var table = getTableById(state, tableId);
		if (!table) {
			return [];
		}

		return table.seats
			.filter(function (seat) {
				return Boolean(seat.guestId);
			})
			.map(function (seat) {
				return seat.guestId;
			});
	}

	function hasConflictAtTable(state, guestId, tableId) {
		var conflicts = state.conflictMap[guestId] || [];
		if (!conflicts.length) {
			return false;
		}

		return getGuestIdsAtTable(state, tableId).some(function (existingGuestId) {
			return conflicts.indexOf(existingGuestId) !== -1;
		});
	}

	function unassignGuest(state, guestId) {
		var guest = findGuest(state, guestId);
		if (!guest) {
			return;
		}

		if (guest.seatId) {
			var currentSeat = findSeat(state, guest.seatId);
			if (currentSeat) {
				currentSeat.guestId = null;
			}
		}

		guest.seatId = null;
	}

	function moveGuestToSeat(state, guestId, seatId) {
		var guest = findGuest(state, guestId);
		var targetSeat = findSeat(state, seatId);
		if (!guest || !targetSeat) {
			return;
		}

		var sourceSeat = guest.seatId ? findSeat(state, guest.seatId) : null;
		var replacedGuest = targetSeat.guestId ? findGuest(state, targetSeat.guestId) : null;

		if (sourceSeat) {
			sourceSeat.guestId = null;
		}

		if (replacedGuest) {
			replacedGuest.seatId = sourceSeat ? sourceSeat.id : null;
			if (sourceSeat) {
				sourceSeat.guestId = replacedGuest.id;
			}
		}

		targetSeat.guestId = guest.id;
		guest.seatId = targetSeat.id;
	}

	function chooseSeatForGuest(state, guest, preferredTableId) {
		var bestScore = -100000;
		var bestSeat = null;
		var pairIds = state.pairMap[guest.id] || [];
		var pairTableIds = pairIds
			.map(function (pairId) {
				return getGuestTableId(findGuest(state, pairId));
			})
			.filter(Boolean);

		state.tables.forEach(function (table) {
			table.seats.forEach(function (seat) {
				var score = 0;
				var tableGuestIds;

				if (seat.guestId) {
					return;
				}

				if (hasConflictAtTable(state, guest.id, table.id)) {
					score -= 1000;
				}

				if (preferredTableId && table.id === preferredTableId) {
					score += 22;
				}

				if (pairTableIds.indexOf(table.id) !== -1) {
					score += 42;
				}

				if (guest.preference !== 'none' && seat.zone === guest.preference) {
					score += 30;
				} else if (guest.preference === 'none' && seat.zone === 'normal') {
					score += 8;
				} else if (guest.preference !== 'none' && seat.zone === 'normal') {
					score += 6;
				}

				tableGuestIds = getGuestIdsAtTable(state, table.id);
				tableGuestIds.forEach(function (existingGuestId) {
					var existingGuest = findGuest(state, existingGuestId);
					if (existingGuest && existingGuest.group === guest.group) {
						score += 10;
					}
					if (pairIds.indexOf(existingGuestId) !== -1) {
						score += 25;
					}
				});

				score -= tableGuestIds.length;

				if (score > bestScore) {
					bestScore = score;
					bestSeat = seat;
				}
			});
		});

		return bestSeat;
	}

	function autoPlaceGuests(state) {
		clearAssignments(state);

		var groupTableMap = {};
		var sortedGuests = state.guests.slice().sort(function (left, right) {
			var priority = { stage: 0, aisle: 1, none: 2 };
			var leftPairWeight = (state.pairMap[left.id] || []).length;
			var rightPairWeight = (state.pairMap[right.id] || []).length;
			var leftConflictWeight = (state.conflictMap[left.id] || []).length;
			var rightConflictWeight = (state.conflictMap[right.id] || []).length;

			if (priority[left.preference] !== priority[right.preference]) {
				return priority[left.preference] - priority[right.preference];
			}

			if (leftPairWeight !== rightPairWeight) {
				return rightPairWeight - leftPairWeight;
			}

			return rightConflictWeight - leftConflictWeight;
		});

		sortedGuests.forEach(function (guest) {
			var preferredTableId = null;
			var pairGuestIds = state.pairMap[guest.id] || [];

			pairGuestIds.some(function (pairGuestId) {
				var pairGuest = findGuest(state, pairGuestId);
				var pairTableId = getGuestTableId(pairGuest);
				if (pairTableId) {
					preferredTableId = pairTableId;
					return true;
				}
				return false;
			});

			if (!preferredTableId) {
				preferredTableId = groupTableMap[guest.group] || null;
			}

			var seat = chooseSeatForGuest(state, guest, preferredTableId);
			if (!seat) {
				return;
			}

			moveGuestToSeat(state, guest.id, seat.id);
			groupTableMap[guest.group] = seat.id.split('-seat-')[0];
		});
	}

	function buildWarnings(state) {
		var warnings = [];

		state.rules.conflicts.forEach(function (rule) {
			var leftGuest = findGuest(state, rule.leftId);
			var rightGuest = findGuest(state, rule.rightId);
			if (!leftGuest || !rightGuest || !leftGuest.seatId || !rightGuest.seatId) {
				return;
			}

			if (getTableIdBySeatId(leftGuest.seatId) === getTableIdBySeatId(rightGuest.seatId)) {
				warnings.push(rule.leftName + ' and ' + rule.rightName + ' are seated at the same table.');
			}
		});

		state.rules.pairs.forEach(function (rule) {
			var leftGuest = findGuest(state, rule.leftId);
			var rightGuest = findGuest(state, rule.rightId);
			if (!leftGuest || !rightGuest || !leftGuest.seatId || !rightGuest.seatId) {
				return;
			}

			if (getTableIdBySeatId(leftGuest.seatId) !== getTableIdBySeatId(rightGuest.seatId)) {
				warnings.push(rule.leftName + ' and ' + rule.rightName + ' are seated at different tables.');
			}
		});

		return warnings;
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function buildPrintableHtml(state) {
		var warnings = buildWarnings(state);
		var unassignedGuests = state.guests.filter(function (guest) {
			return !guest.seatId;
		});
		var tableMarkup = state.tables.map(function (table) {
			var seatsMarkup = table.seats.map(function (seat) {
				var guest = seat.guestId ? findGuest(state, seat.guestId) : null;
				var zoneLabel = seat.zone === 'stage' ? 'Stage' : (seat.zone === 'aisle' ? 'Aisle' : 'Standard');
				return '<div class="print-seat">' +
					'<div class="print-seat__meta">' + escapeHtml(seat.label) + ' · ' + escapeHtml(zoneLabel) + '</div>' +
					'<div class="print-seat__name">' + escapeHtml(guest ? guest.name : 'Empty') + '</div>' +
					(guest ? '<div class="print-seat__group">' + escapeHtml(guest.group) + '</div>' : '') +
				'</div>';
			}).join('');

			return '<section class="print-table">' +
				'<div class="print-table__head">' +
					'<h2>' + escapeHtml(table.name) + '</h2>' +
					'<span>' + escapeHtml(table.configLabel) + '</span>' +
				'</div>' +
				'<div class="print-table__grid">' + seatsMarkup + '</div>' +
			'</section>';
		}).join('');

		var warningsMarkup = warnings.length
			? '<section class="print-box"><h3>Warnings</h3><ul>' + warnings.map(function (warning) {
				return '<li>' + escapeHtml(warning) + '</li>';
			}).join('') + '</ul></section>'
			: '';

		var unassignedMarkup = unassignedGuests.length
			? '<section class="print-box"><h3>Unseated guests</h3><ul>' + unassignedGuests.map(function (guest) {
				return '<li>' + escapeHtml(guest.name + ' · ' + guest.group) + '</li>';
			}).join('') + '</ul></section>'
			: '';

		return '<!DOCTYPE html><html lang="en-US"><head><meta charset="utf-8"><title>Seating Plan</title><style>' +
			'body{font-family:Arial,sans-serif;padding:24px;color:#1f2a44;background:#fff;}h1{margin:0 0 8px;color:#0f1a6d;}p{margin:0 0 16px;color:#5b6880;}h2,h3{margin:0;color:#0f1a6d;}section{margin-bottom:20px;} .print-grid{display:grid;gap:16px;} .print-box{padding:16px;border:1px solid #e1e8ee;border-radius:12px;background:#fafcff;} .print-box ul{margin:10px 0 0;padding-left:18px;} .print-table{padding:16px;border:1px solid #e1e8ee;border-radius:14px;page-break-inside:avoid;} .print-table__head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:14px;} .print-table__head span{color:#db0962;font-weight:700;} .print-table__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;} .print-seat{padding:12px;border:1px solid #e6ebf3;border-radius:12px;background:#fff;} .print-seat__meta{font-size:12px;color:#7a869d;margin-bottom:6px;} .print-seat__name{font-weight:700;color:#0f1a6d;} .print-seat__group{font-size:12px;color:#5f6c84;margin-top:4px;} @media print{body{padding:0;} .print-table{break-inside:avoid;}}' +
			'</style></head><body>' +
			'<h1>Seating Plan</h1>' +
			'<p>' + escapeHtml(state.tables.length + ' tables, ' + state.guests.length + ' guests') + '</p>' +
			warningsMarkup +
			unassignedMarkup +
			'<div class="print-grid">' + tableMarkup + '</div>' +
			'</body></html>';
	}

	function exportPlannerAsPdf(state) {
		var printWindow = window.open('', '_blank', 'width=1200,height=900');
		if (!printWindow) {
			return;
		}

		var printableHtml = buildPrintableHtml(state);

		printWindow.document.open();
		printWindow.document.write(printableHtml);
		printWindow.document.close();

		window.setTimeout(function () {
			printWindow.focus();
			printWindow.print();
		}, 250);
	}

	function renderSummary(root, state) {
		var summary = root.querySelector('[data-seating-summary]');
		var unassigned = state.guests.filter(function (guest) {
			return !guest.seatId;
		}).length;
		var seats = state.tables.reduce(function (count, table) {
			return count + table.seats.length;
		}, 0);
		var warnings = buildWarnings(state).length;

		summary.innerHTML = '<strong>' + state.tables.length + ' tables</strong>, ' + seats + ' seats and ' + state.guests.length + ' guests. Unseated guests: ' + unassigned + '. Seating rule warnings: ' + warnings + '.';
	}

	function renderWarnings(root, state) {
		var warningsHost = root.querySelector('[data-seating-warnings]');
		var warnings = buildWarnings(state);

		if (!warnings.length) {
			warningsHost.classList.remove('is-visible');
			warningsHost.innerHTML = '';
			return;
		}

		warningsHost.classList.add('is-visible');
		warningsHost.innerHTML = '<div class="seating-planner__warnings-title">Items to review</div><ul class="seating-planner__warnings-list">' + warnings.map(function (warning) {
			return '<li>' + warning + '</li>';
		}).join('') + '</ul>';
	}

	function shortGuestName(name) {
		var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
		if (!parts.length) {
			return '';
		}

		if (parts.length === 1) {
			return parts[0];
		}

		return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.';
	}

	function guestInitials(name) {
		var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
		if (!parts.length) {
			return '?';
		}

		if (parts.length === 1) {
			return parts[0].charAt(0).toUpperCase();
		}

		return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
	}

	function guestMarkup(guest, compact) {
		var preferenceLabel = '';
		if (guest.preference === 'stage') {
			preferenceLabel = ' · Stage';
		} else if (guest.preference === 'aisle') {
			preferenceLabel = ' · Aisle';
		}

		if (compact) {
			return '<div class="seating-planner__guest seating-planner__guest--seat" draggable="true" data-guest-id="' + guest.id + '" title="' + guest.name + ' · ' + guest.group + preferenceLabel + '">' +
				'<span class="seating-planner__guest-avatar">' + guestInitials(guest.name) + '</span>' +
				'<span class="seating-planner__guest-name">' + shortGuestName(guest.name) + '</span>' +
			'</div>';
		}

		return '<div class="seating-planner__guest" draggable="true" data-guest-id="' + guest.id + '">' +
			'<span class="seating-planner__guest-avatar">' + guestInitials(guest.name) + '</span>' +
			'<span class="seating-planner__guest-body">' +
				'<span class="seating-planner__guest-name">' + guest.name + '</span>' +
				'<span class="seating-planner__guest-meta">' + guest.group + preferenceLabel + '</span>' +
			'</span>' +
		'</div>';
	}

	function getPlanObjectFootprint(planObject) {
		switch (planObject.type) {
			case 'sahne':
				return { width: 220, height: 112 };
			case 'dans':
				return { width: 220, height: 90 };
			case 'muzik':
				return { width: 150, height: 160 };
			case 'hediye':
				return { width: 88, height: 88 };
			case 'orkestra':
				return { width: 150, height: 74 };
			case 'bar':
				return { width: 118, height: 58 };
			case 'foto':
				return { width: 126, height: 64 };
			case 'giris':
				return { width: 112, height: 56 };
			case 'kokteyl':
				return { width: 128, height: 60 };
			default:
				return { width: 120, height: 58 };
		}
	}

	function seedPlanObjectPosition(root, planObject, index) {
		var metrics = getAreaMetrics(root, planObject.area);
		var footprint = getPlanObjectFootprint(planObject);
		var row = Math.floor(index / 3);
		var column = index % 3;

		planObject.position = clampTablePosition(metrics, footprint, {
			x: metrics.paddingX + column * 160,
			y: metrics.paddingY + row * 84
		});
	}

	function createPlanObject(type, label, index, root) {
		var normalizedType = type || 'ozel';
		var defaultLabels = {
			sahne: 'Sweetheart table',
			dans: 'Dance floor',
			muzik: 'Music area',
			hediye: 'Gift table',
			orkestra: 'Band',
			bar: 'Bar',
			foto: 'Photo area',
			giris: 'Entrance',
			kokteyl: 'Cocktail area',
			ozel: 'Object'
		};

		var planObject = {
			id: 'object-' + (index + 1),
			type: normalizedType,
			label: (label || '').trim() || defaultLabels[normalizedType] || defaultLabels.ozel,
			area: 'main',
			position: { x: 0, y: 0 }
		};

		seedPlanObjectPosition(root, planObject, index);
		return planObject;
	}

	function planObjectMarkup(planObject) {
		var footprint = getPlanObjectFootprint(planObject);
		return '<div class="seating-planner__plan-object seating-planner__plan-object--' + planObject.type + '" data-plan-object-id="' + planObject.id + '" style="left:' + planObject.position.x + 'px;top:' + planObject.position.y + 'px;width:' + footprint.width + 'px;height:' + footprint.height + 'px;">' +
			'<button type="button" class="seating-planner__plan-object-handle" data-plan-object-drag aria-label="Move object">Drag</button>' +
			'<span class="seating-planner__plan-object-label">' + planObject.label + '</span>' +
			'<button type="button" class="seating-planner__plan-object-remove" data-plan-object-remove="' + planObject.id + '" aria-label="Remove object">Remove</button>' +
		'</div>';
	}

	function getSeatPosition(layout, seatIndex, seatCount) {
		if (layout.indexOf('row') === 0) {
			var rowOrder = [
				{ left: 18, top: 22 },
				{ right: 18, top: 22 },
				{ left: 18, top: 92 },
				{ right: 18, top: 92 },
				{ left: 18, top: 162 },
				{ right: 18, top: 162 }
			];

			return rowOrder[seatIndex] || { left: 18, top: 22 + seatIndex * 54 };
		}

		var roundLayouts = {
			4: [
				{ leftPercent: 50, topPercent: 14 },
				{ leftPercent: 82, topPercent: 50 },
				{ leftPercent: 50, topPercent: 86 },
				{ leftPercent: 18, topPercent: 50 }
			],
			5: [
				{ leftPercent: 50, topPercent: 12 },
				{ leftPercent: 82, topPercent: 34 },
				{ leftPercent: 72, topPercent: 78 },
				{ leftPercent: 28, topPercent: 78 },
				{ leftPercent: 18, topPercent: 34 }
			],
			6: [
				{ leftPercent: 50, topPercent: 12 },
				{ leftPercent: 82, topPercent: 32 },
				{ leftPercent: 82, topPercent: 68 },
				{ leftPercent: 50, topPercent: 88 },
				{ leftPercent: 18, topPercent: 68 },
				{ leftPercent: 18, topPercent: 32 }
			],
			8: [
				{ leftPercent: 50, topPercent: 10 },
				{ leftPercent: 74, topPercent: 18 },
				{ leftPercent: 88, topPercent: 42 },
				{ leftPercent: 88, topPercent: 70 },
				{ leftPercent: 50, topPercent: 90 },
				{ leftPercent: 12, topPercent: 70 },
				{ leftPercent: 12, topPercent: 42 },
				{ leftPercent: 26, topPercent: 18 }
			]
		};

		var preset = roundLayouts[seatCount];
		if (preset && preset[seatIndex]) {
			return preset[seatIndex];
		}

		var centerX = 50;
		var centerY = 50;
		var radius = 38;
		var angle = ((Math.PI * 2) / seatCount) * seatIndex - Math.PI / 2;

		return {
			leftPercent: centerX + Math.cos(angle) * radius,
			topPercent: centerY + Math.sin(angle) * radius
		};
	}

	function seatStyle(layout, seatIndex, seatCount) {
		var position = getSeatPosition(layout, seatIndex, seatCount);

		if (layout.indexOf('row') === 0) {
			return (position.left !== undefined ? 'left:' + position.left + 'px;' : 'right:' + position.right + 'px;') + 'top:' + position.top + 'px;';
		}

		return 'left:' + position.leftPercent + '%;top:' + position.topPercent + '%;transform:translate(-50%, -50%);';
	}

	function tableMarkup(table, state) {
		var occupied = table.seats.filter(function (seat) {
			return Boolean(seat.guestId);
		}).length;
		var collapsedClass = table.collapsed ? ' is-collapsed' : '';

		if (table.collapsed) {
			return '<button type="button" class="seating-planner__table seating-planner__table--floating seating-planner__table--mini" data-table-expand="' + table.id + '" style="left:' + table.position.x + 'px;top:' + table.position.y + 'px;">' +
				'<span class="seating-planner__table-mini-label">Table</span>' +
				'<strong class="seating-planner__table-mini-number">' + table.name.replace('Table ', '') + '</strong>' +
			'</button>';
		}

		var seatClass = table.layout.indexOf('row') === 0 ? 'seating-planner__seat-list seating-planner__seat-list--row' : 'seating-planner__seat-list seating-planner__seat-list--round';
		var footprint = getTableFootprint(table);
		var seatsMarkup = table.seats.map(function (seat, seatIndex) {
			var guest = seat.guestId ? findGuest(state, seat.guestId) : null;
			var seatZoneClass = seat.zone === 'stage'
				? ' seating-planner__seat--stage'
				: (seat.zone === 'aisle' ? ' seating-planner__seat--aisle' : '');

			return '<div class="seating-planner__seat' + seatZoneClass + '" data-seat-id="' + seat.id + '" style="' + seatStyle(table.layout, seatIndex, table.seats.length) + '">' +
				'<div class="seating-planner__seat-label"><span>' + (seatIndex + 1) + '</span></div>' +
				(guest ? guestMarkup(guest, true) : '<div class="seating-planner__placeholder">Empty</div>') +
			'</div>';
		}).join('');

		return '<div class="seating-planner__table seating-planner__table--floating seating-planner__table--plan' + collapsedClass + '" data-table-id="' + table.id + '" style="left:' + table.position.x + 'px;top:' + table.position.y + 'px;width:' + footprint.width + 'px;height:' + footprint.height + 'px;">' +
			'<div class="seating-planner__table-head">' +
				'<div>' +
					'<span class="seating-planner__table-kicker">' + table.configLabel + '</span>' +
					'<h3 class="seating-planner__table-title">' + table.name + '</h3>' +
				'</div>' +
				'<div class="seating-planner__table-actions">' +
					'<button type="button" class="seating-planner__table-handle" data-table-drag aria-label="Move table">Drag</button>' +
					'<button type="button" class="seating-planner__table-collapse" data-table-collapse="' + table.id + '" aria-label="Collapse table">Collapse</button>' +
				'</div>' +
			'</div>' +
			'<span class="seating-planner__table-meta">' + occupied + '/' + table.seats.length + ' occupied</span>' +
			'<div class="seating-planner__table-top ' + (table.layout.indexOf('row') === 0 ? 'seating-planner__table-top--row' : 'seating-planner__table-top--round') + '">' + table.name.replace('Table ', '') + '</div>' +
			'<div class="' + seatClass + '">' + seatsMarkup + '</div>' +
		'</div>';
	}

	function render(root, state) {
		var pool = root.querySelector('[data-seating-pool]');
		var mainTables = root.querySelector('[data-seating-tables-main]');
		var annexTables = root.querySelector('[data-seating-tables-annex]');
		var mainObjects = root.querySelector('[data-seating-objects-main]');
		var annexObjects = root.querySelector('[data-seating-objects-annex]');
		var count = root.querySelector('[data-seating-unassigned-count]');

		var unassignedGuests = state.guests.filter(function (guest) {
			return !guest.seatId;
		});

		count.textContent = String(unassignedGuests.length);
		pool.innerHTML = unassignedGuests.length
			? unassignedGuests.map(function (guest) {
				return guestMarkup(guest, false);
			}).join('')
			: '<div class="seating-planner__empty">All guests have been seated.</div>';

		mainTables.innerHTML = state.tables.filter(function (table) {
			return table.area !== 'annex';
		}).map(function (table) {
			return tableMarkup(table, state);
		}).join('') || '<div class="seating-planner__scene-empty">No tables in the main room yet.</div>';

		mainObjects.innerHTML = state.planObjects.filter(function (planObject) {
			return planObject.area !== 'annex';
		}).map(planObjectMarkup).join('');

		annexTables.innerHTML = state.tables.filter(function (table) {
			return table.area === 'annex';
		}).map(function (table) {
			return tableMarkup(table, state);
		}).join('') || '<div class="seating-planner__scene-empty">No tables in the additional area yet.</div>';

		annexObjects.innerHTML = state.planObjects.filter(function (planObject) {
			return planObject.area === 'annex';
		}).map(planObjectMarkup).join('');

		renderSummary(root, state);
		renderWarnings(root, state);
		attachInteractions(root, state);
	}

	function attachInteractions(root, state) {
		var draggableItems = root.querySelectorAll('[data-guest-id]');
		var seats = root.querySelectorAll('[data-seat-id]');
		var pool = root.querySelector('[data-seating-pool]');
		var tableHandles = root.querySelectorAll('[data-table-drag]');
		var collapseButtons = root.querySelectorAll('[data-table-collapse]');
		var expandButtons = root.querySelectorAll('[data-table-expand]');
		var objectHandles = root.querySelectorAll('[data-plan-object-drag]');
		var objectRemoveButtons = root.querySelectorAll('[data-plan-object-remove]');

		function startTableDrag(pointerEvent, tableElement, table, options) {
			var areaName = table ? table.area : 'main';
			var areaElement = getAreaElement(root, areaName);
			var moved = false;
			var startX = pointerEvent.clientX;
			var startY = pointerEvent.clientY;

			if (!table || !tableElement || !areaElement) {
				return;
			}

			var tableRect = tableElement.getBoundingClientRect();
			var pointerOffsetX = pointerEvent.clientX - tableRect.left;
			var pointerOffsetY = pointerEvent.clientY - tableRect.top;
			var footprint = table.collapsed ? { width: 92, height: 92 } : getTableFootprint(table);

			tableElement.classList.add('is-dragging');
			if (pointerEvent.currentTarget && pointerEvent.currentTarget.setPointerCapture) {
				pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
			}
			pointerEvent.preventDefault();

			function onPointerMove(moveEvent) {
				var hoveredArea = resolveAreaByPointer(moveEvent);
				if (Math.abs(moveEvent.clientX - startX) > 4 || Math.abs(moveEvent.clientY - startY) > 4) {
					moved = true;
				}

				if (hoveredArea && hoveredArea !== areaName) {
					areaName = hoveredArea;
					areaElement = getAreaElement(root, areaName);
					if (areaElement && tableElement.parentNode !== areaElement) {
						areaElement.appendChild(tableElement);
					}
					table.area = areaName;
				}

				if (!areaElement) {
					return;
				}

				var areaRect = areaElement.getBoundingClientRect();
				var metrics = getAreaMetrics(root, areaName);
				var nextPosition = clampTablePosition(metrics, footprint, {
					x: moveEvent.clientX - areaRect.left - pointerOffsetX,
					y: moveEvent.clientY - areaRect.top - pointerOffsetY
				});

				table.position = nextPosition;
				tableElement.style.left = nextPosition.x + 'px';
				tableElement.style.top = nextPosition.y + 'px';
			}

			function stopDragging(stopEvent) {
				if (stopEvent.pointerId !== pointerEvent.pointerId) {
					return;
				}

				tableElement.classList.remove('is-dragging');
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', stopDragging);
				window.removeEventListener('pointercancel', stopDragging);

				if (!moved && options && typeof options.onClick === 'function') {
					options.onClick();
					return;
				}

				render(root, state);
			}

			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', stopDragging);
			window.addEventListener('pointercancel', stopDragging);
		}

		function startPlanObjectDrag(pointerEvent, objectElement, planObject) {
			var areaName = planObject ? planObject.area : 'main';
			var areaElement = getObjectAreaElement(root, areaName);

			if (!planObject || !objectElement || !areaElement) {
				return;
			}

			var objectRect = objectElement.getBoundingClientRect();
			var pointerOffsetX = pointerEvent.clientX - objectRect.left;
			var pointerOffsetY = pointerEvent.clientY - objectRect.top;
			var footprint = getPlanObjectFootprint(planObject);

			objectElement.classList.add('is-dragging');
			if (pointerEvent.currentTarget && pointerEvent.currentTarget.setPointerCapture) {
				pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
			}
			pointerEvent.preventDefault();

			function onPointerMove(moveEvent) {
				var hoveredArea = resolveAreaByPointer(moveEvent);
				if (hoveredArea && hoveredArea !== areaName) {
					areaName = hoveredArea;
					areaElement = getObjectAreaElement(root, areaName);
					if (areaElement && objectElement.parentNode !== areaElement) {
						areaElement.appendChild(objectElement);
					}
					planObject.area = areaName;
				}

				if (!areaElement) {
					return;
				}

				var areaRect = areaElement.getBoundingClientRect();
				var metrics = getAreaMetrics(root, areaName);
				var nextPosition = clampTablePosition(metrics, footprint, {
					x: moveEvent.clientX - areaRect.left - pointerOffsetX,
					y: moveEvent.clientY - areaRect.top - pointerOffsetY
				});

				planObject.position = nextPosition;
				objectElement.style.left = nextPosition.x + 'px';
				objectElement.style.top = nextPosition.y + 'px';
			}

			function stopDragging(stopEvent) {
				if (stopEvent.pointerId !== pointerEvent.pointerId) {
					return;
				}

				objectElement.classList.remove('is-dragging');
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', stopDragging);
				window.removeEventListener('pointercancel', stopDragging);
				render(root, state);
			}

			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', stopDragging);
			window.addEventListener('pointercancel', stopDragging);
		}

		draggableItems.forEach(function (item) {
			item.addEventListener('dragstart', function (event) {
				state.dragGuestId = item.getAttribute('data-guest-id');
				event.dataTransfer.effectAllowed = 'move';
				event.dataTransfer.setData('text/plain', state.dragGuestId || '');
			});
		});

		seats.forEach(function (seat) {
			seat.addEventListener('dragover', function (event) {
				event.preventDefault();
				seat.classList.add('is-drop-target');
			});
			seat.addEventListener('dragleave', function () {
				seat.classList.remove('is-drop-target');
			});
			seat.addEventListener('drop', function (event) {
				event.preventDefault();
				seat.classList.remove('is-drop-target');
				if (!state.dragGuestId) {
					return;
				}
				moveGuestToSeat(state, state.dragGuestId, seat.getAttribute('data-seat-id'));
				state.dragGuestId = null;
				render(root, state);
			});
		});

		pool.addEventListener('dragover', function (event) {
			event.preventDefault();
		});

		pool.addEventListener('drop', function (event) {
			event.preventDefault();
			if (!state.dragGuestId) {
				return;
			}
			unassignGuest(state, state.dragGuestId);
			state.dragGuestId = null;
			render(root, state);
		});

		function resolveAreaByPointer(pointerEvent) {
			var mainArea = getAreaElement(root, 'main');
			var annexArea = getAreaElement(root, 'annex');
			var mainRect = mainArea ? mainArea.getBoundingClientRect() : null;
			var annexRect = annexArea ? annexArea.getBoundingClientRect() : null;

			if (annexRect && pointerEvent.clientX >= annexRect.left && pointerEvent.clientX <= annexRect.right && pointerEvent.clientY >= annexRect.top && pointerEvent.clientY <= annexRect.bottom) {
				return 'annex';
			}

			if (mainRect && pointerEvent.clientX >= mainRect.left && pointerEvent.clientX <= mainRect.right && pointerEvent.clientY >= mainRect.top && pointerEvent.clientY <= mainRect.bottom) {
				return 'main';
			}

			return null;
		}

		collapseButtons.forEach(function (button) {
			button.addEventListener('click', function () {
				var table = getTableById(state, button.getAttribute('data-table-collapse'));
				if (!table) {
					return;
				}

				table.collapsed = true;
				render(root, state);
			});
		});

		expandButtons.forEach(function (button) {
			button.addEventListener('pointerdown', function (event) {
				var tableId = button.getAttribute('data-table-expand');
				var table = getTableById(state, tableId);
				startTableDrag(event, button, table, {
					onClick: function () {
						table.collapsed = false;
						render(root, state);
					}
				});
			});
		});

		tableHandles.forEach(function (handle) {
			handle.addEventListener('pointerdown', function (event) {
				var tableElement = handle.closest('[data-table-id]');
				var tableId = tableElement ? tableElement.getAttribute('data-table-id') : null;
				var table = getTableById(state, tableId);
				startTableDrag(event, tableElement, table);
			});
		});

		objectHandles.forEach(function (handle) {
			handle.addEventListener('pointerdown', function (event) {
				var objectElement = handle.closest('[data-plan-object-id]');
				var planObject = state.planObjects.find(function (entry) {
					return entry.id === (objectElement ? objectElement.getAttribute('data-plan-object-id') : '');
				}) || null;
				startPlanObjectDrag(event, objectElement, planObject);
			});
		});

		objectRemoveButtons.forEach(function (button) {
			button.addEventListener('click', function () {
				state.planObjects = state.planObjects.filter(function (entry) {
					return entry.id !== button.getAttribute('data-plan-object-remove');
				});
				render(root, state);
			});
		});
	}

	planners.forEach(function (root) {
		var guestInput = root.querySelector('[data-seating-guests]');
		var pairsInput = root.querySelector('[data-seating-pairs]');
		var conflictsInput = root.querySelector('[data-seating-conflicts]');
		var configList = root.querySelector('[data-seating-config-list]');
		var configTemplate = root.querySelector('[data-seating-config-template]');
		var addConfigButton = root.querySelector('[data-seating-add-config]');
		var stageCountInput = root.querySelector('[data-seating-stage-count]');
		var aisleCountInput = root.querySelector('[data-seating-aisle-count]');
		var buildButton = root.querySelector('[data-seating-build]');
		var autofillButton = root.querySelector('[data-seating-autofill]');
		var exportPdfButton = root.querySelector('[data-seating-export-pdf]');
		var resetButton = root.querySelector('[data-seating-reset]');
		var demoButton = root.querySelector('[data-seating-demo]');
		var objectTypeSelect = root.querySelector('[data-seating-object-type]');
		var objectLabelInput = root.querySelector('[data-seating-object-label]');
		var addObjectButton = root.querySelector('[data-seating-add-object]');

		var defaultGuestText = guestInput.value;
		var defaultPairText = pairsInput.value;
		var defaultConflictText = conflictsInput.value;
		var defaultConfigMarkup = configList.innerHTML;
		var state = {
			guests: [],
			tables: [],
			planObjects: [],
			dragGuestId: null,
			rules: {
				pairs: [],
				conflicts: []
			},
			pairMap: {},
			conflictMap: {}
		};

		function rebuild(shouldAutoPlace) {
			var configs = parseTableConfigs(root);
			state.guests = parseGuests(guestInput.value);
			state.lookup = buildGuestLookup(state.guests);
			state.rules = {
				pairs: parseRuleLines(pairsInput.value, state.lookup),
				conflicts: parseRuleLines(conflictsInput.value, state.lookup)
			};
			state.pairMap = buildRuleMap(state.rules.pairs);
			state.conflictMap = buildRuleMap(state.rules.conflicts);
			state.tables = buildTables(
				configs.length ? configs : [{ layout: 'round-6', label: 'Round table · 6 seats', count: 1 }],
				Math.max(0, parseInt(stageCountInput.value, 10) || 0),
				Math.max(0, parseInt(aisleCountInput.value, 10) || 0)
			);
			seedTablePlacements(root, state.tables);

			if (shouldAutoPlace) {
				autoPlaceGuests(state);
			}

			render(root, state);
		}

		buildButton.addEventListener('click', function () {
			rebuild(false);
		});

		autofillButton.addEventListener('click', function () {
			rebuild(true);
		});

		exportPdfButton.addEventListener('click', function () {
			exportPlannerAsPdf(state);
		});

		resetButton.addEventListener('click', function () {
			guestInput.value = '';
			pairsInput.value = '';
			conflictsInput.value = '';
			configList.innerHTML = defaultConfigMarkup;
			state.planObjects = [];
			rebuild(false);
		});

		demoButton.addEventListener('click', function () {
			guestInput.value = defaultGuestText;
			pairsInput.value = defaultPairText;
			conflictsInput.value = defaultConflictText;
			configList.innerHTML = defaultConfigMarkup;
			state.planObjects = [];
			rebuild(true);
		});

		addObjectButton.addEventListener('click', function () {
			var planObject = createPlanObject(
				objectTypeSelect ? objectTypeSelect.value : 'ozel',
				objectLabelInput ? objectLabelInput.value : '',
				state.planObjects.length,
				root
			);
			state.planObjects.push(planObject);
			if (objectLabelInput) {
				objectLabelInput.value = '';
			}
			render(root, state);
		});

		addConfigButton.addEventListener('click', function () {
			if (!configTemplate) {
				return;
			}
			configList.insertAdjacentHTML('beforeend', configTemplate.innerHTML.trim());
		});

		configList.addEventListener('click', function (event) {
			var removeButton = event.target.closest('[data-seating-remove-config]');
			if (!removeButton) {
				return;
			}

			if (configList.querySelectorAll('[data-seating-config-row]').length <= 1) {
				return;
			}

			removeButton.closest('[data-seating-config-row]').remove();
		});

		rebuild(true);
	});
});
