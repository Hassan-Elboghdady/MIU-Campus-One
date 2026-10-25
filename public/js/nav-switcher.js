/* nav-switcher.js
   Dynamically rewrites <nav class="app-nav"> and injects a role badge
   based on the signed-in user's role. Admin is left unchanged.
   Works on file:// — pure IIFE, no ES modules.
*/
(function () {
  'use strict';

  var s = null;
  try { s = JSON.parse(localStorage.getItem('campusone_session')); } catch (e) {}
  if (!s || !s.role) return;

  var NAV_SETS = {
    manager: {
      badge: { text: 'Manager', cls: 'role-badge--manager' },
      links: [
        { href: 'manager-dashboard.html', label: 'Overview',      activeOn: ['manager-dashboard.html'] },
        { href: 'maintenance-team.html',  label: 'Team',          activeOn: ['maintenance-team.html']  },
        { href: 'map.html',               label: 'Campus Map',    activeOn: ['map.html']               },
        { href: 'emergency.html',         label: 'Emergency Map', activeOn: ['emergency.html']         }
      ]
    },
    supervisor: {
      badge: { text: 'Manager', cls: 'role-badge--manager' },
      links: [
        { href: 'manager-dashboard.html', label: 'Overview',      activeOn: ['manager-dashboard.html'] },
        { href: 'maintenance-team.html',  label: 'Team',          activeOn: ['maintenance-team.html']  },
        { href: 'map.html',               label: 'Campus Map',    activeOn: ['map.html']               },
        { href: 'emergency.html',         label: 'Emergency Map', activeOn: ['emergency.html']         }
      ]
    },
    staff: {
      badge: { text: 'Staff', cls: 'role-badge--staff' },
      links: [
        { href: 'staff-dashboard.html',   label: 'Dashboard',     activeOn: ['staff-dashboard.html']              },
        { href: 'my-tasks.html',          label: 'My Tasks',      activeOn: ['my-tasks.html','task-details.html'] },
        { href: 'map.html',               label: 'Campus Map',    activeOn: ['map.html']                          },
        { href: 'emergency.html',         label: 'Emergency Map', activeOn: ['emergency.html']                    }
      ]
    },
    technician: {
      badge: { text: 'Staff', cls: 'role-badge--staff' },
      links: [
        { href: 'staff-dashboard.html',   label: 'Dashboard',     activeOn: ['staff-dashboard.html']              },
        { href: 'my-tasks.html',          label: 'My Tasks',      activeOn: ['my-tasks.html','task-details.html'] },
        { href: 'map.html',               label: 'Campus Map',    activeOn: ['map.html']                          },
        { href: 'emergency.html',         label: 'Emergency Map', activeOn: ['emergency.html']                    }
      ]
    },
    'lost-found-staff': {
      badge: { text: 'L&F Staff', cls: 'role-badge--lf' },
      links: [
        { href: 'staff-lost-found.html',  label: 'L&F Dashboard', activeOn: ['staff-lost-found.html'] },
        { href: 'lost-and-found.html',    label: 'Lost & Found',  activeOn: ['lost-and-found.html']   },
        { href: 'map.html',               label: 'Campus Map',    activeOn: ['map.html']              },
        { href: 'emergency.html',         label: 'Emergency Map', activeOn: ['emergency.html']        }
      ]
    },
    student: {
      badge: null,
      links: [
        { href: 'home.html',           label: 'Home',          activeOn: ['home.html','index.html'] },
        { href: 'report.html',         label: 'Report Issue',  activeOn: ['report.html']            },
        { href: 'my-reports.html',     label: 'My Reports',    activeOn: ['my-reports.html']        },
        { href: 'lost-and-found.html', label: 'Lost & Found',  activeOn: ['lost-and-found.html']    },
        { href: 'map.html',            label: 'Campus Map',    activeOn: ['map.html']               },
        { href: 'emergency.html',      label: 'Emergency Map', activeOn: ['emergency.html']         }
      ]
    }
  };

  var role = s.role;
  if (role === 'admin') return; /* Admin keeps its own header */

  var def = NAV_SETS[role];
  if (!def) return;

  var page = (window.location.pathname.split('/').pop()) || 'index.html';

  /* Replace nav links */
  var nav = document.getElementById('app-nav');
  if (nav) {
    nav.innerHTML = def.links.map(function (lnk) {
      var isActive = lnk.activeOn.indexOf(page) !== -1;
      return '<a href="' + lnk.href + '" class="app-nav__link' + (isActive ? ' is-active' : '') + '"' +
             (isActive ? ' aria-current="page"' : '') + '>' + lnk.label + '</a>';
    }).join('\n        ');
  }

  /* Inject role badge before notification bell */
  if (def.badge) {
    var existing = document.getElementById('nav-role-badge');
    if (!existing) {
      var actions = document.querySelector('.app-header__actions');
      if (actions) {
        var badge = document.createElement('span');
        badge.id          = 'nav-role-badge';
        badge.className   = 'role-badge ' + def.badge.cls;
        badge.textContent = def.badge.text;
        badge.style.cssText = 'flex-shrink:0;';
        actions.insertBefore(badge, actions.firstChild);
      }
    } else {
      existing.className   = 'role-badge ' + def.badge.cls;
      existing.textContent = def.badge.text;
    }
  }
})();
