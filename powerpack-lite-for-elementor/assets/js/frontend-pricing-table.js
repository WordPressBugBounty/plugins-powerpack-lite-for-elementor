(function ($) {
	$( window ).on( 'elementor/frontend/init', () => {
		class TableWidget extends elementorModules.frontend.handlers.Base {
			getDefaultSettings() {
				return {
					selectors: {
						table: '.pp-table',
					},
				};
			}

			getDefaultElements() {
				const selectors = this.getSettings( 'selectors' );
				return {
					$table: this.$element.find( selectors.table ),
				};
			}

			bindEvents() {
				this.initTooltips();
			}

			initTooltips() {
				const elementSettings = this.getElementSettings(),
					elementID         = this.getID(),
					$tooltipElements  = this.$element.find('[data-tooltip]'),
					tooltipArrow      = elementSettings.tooltip_arrow === 'yes',
					tooltipTrigger    = elementSettings.tooltip_trigger || 'hover',
					tooltipAnimation  = elementSettings.tooltip_animation || 'fade',
					tooltipSize       = elementSettings.tooltip_size,
					tooltipZIndex     = elementSettings.tooltip_zindex || 99,
					breakpoints       = elementorFrontend.config.responsive.activeBreakpoints;

				let tooltipClass = `pp-tooltip pp-tooltip-${elementID}`;
				if (['default', 'tiny', 'small', 'large'].includes(tooltipSize)) {
					tooltipClass += ` pp-tooltip-size-${tooltipSize}`;
				}

				const getTooltipPosition = (tooltipOptions) => {
					const windowWidth = window.innerWidth;

					const breakpointPositions = [
						{ bp: breakpoints.widescreen, position: tooltipOptions.position_widescreen },
						{ bp: breakpoints.laptop, position: tooltipOptions.position },
						{ bp: breakpoints.tablet_extra, position: tooltipOptions.position_laptop },
						{ bp: breakpoints.tablet, position: tooltipOptions.position_tablet_extra },
						{ bp: breakpoints.mobile_extra, position: tooltipOptions.position_tablet },
						{ bp: breakpoints.mobile, position: tooltipOptions.position_mobile_extra },
					];

					for (const { bp, position } of breakpointPositions) {
						if (bp && windowWidth > bp.value && position) {
							return position;
						}
					}

					return tooltipOptions.position_mobile || 'top';
				};


				const isClickTooltip = ( 'click' === tooltipTrigger );

				// An editor re-render runs this again; drop the previous pass's Escape handlers.
				$(document).off('keydown.ppTableTooltip-' + elementID);

				$tooltipElements.each(function () {
					const $this         = $(this),
						tooltipOptions  = $this.data('tooltip') || {},
						tooltipPosition = getTooltipPosition(tooltipOptions),
						contentSelector = $this.attr('data-tooltip-content'),
						$source         = contentSelector ? $(contentSelector) : $(),
						tooltipConfig   = {
							// Tooltipster core only binds pointer triggers, so drive
							// open/close ourselves and keep focus and Escape working.
							trigger:         'custom',
							triggerOpen:     isClickTooltip
								? { click: true, tap: true }
								: { mouseenter: true, touchstart: true },
							triggerClose:    isClickTooltip
								? { click: true, tap: true }
								: { mouseleave: true, touchleave: true, originClick: true },
							animation:       tooltipAnimation,
							minWidth:        tooltipOptions.width || 'auto',
							ppclass:         tooltipClass,
							side:            tooltipPosition,
							arrow:           tooltipArrow,
							distance:        tooltipOptions.distance || 10,
							interactive:     true,
							positionTracker: true,
							zIndex:          tooltipZIndex,

							functionReady:   function ( instance, helper ) {
								// aria-expanded belongs to the click disclosure only; a hover
								// tooltip is described by aria-describedby, not expanded.
								if ( isClickTooltip ) {
									$( helper.origin ).attr( 'aria-expanded', 'true' );

									// Park focus in the panel so any links inside are reachable.
									$( helper.tooltip ).attr( 'tabindex', '-1' ).trigger( 'focus' );
								}
							},
							functionAfter:   function ( instance, helper ) {
								if ( isClickTooltip ) {
									$( helper.origin ).attr( 'aria-expanded', 'false' );
								}
							},
						};

					// Keep the in-page node (the aria-describedby target) where it is and hand
					// tooltipster an id-less clone, so the description keeps resolving and no
					// duplicate id ever exists while the tooltip is open.
					if ( $source.length ) {
						tooltipConfig.content = $source.clone().removeAttr('id').removeAttr('role');
					}

					$this.pptooltipster(tooltipConfig);

					const isOpen = () => $this.hasClass('tooltipstered') && $this.pptooltipster('status').open;

					if ( ! isClickTooltip ) {
						// Hover mode: focus is the keyboard equivalent of mouseenter.
						$this.on('focusin.ppTableTooltip', function () {
							$this.pptooltipster('open');
						}).on('focusout.ppTableTooltip', function ( event ) {
							if ( ! event.relatedTarget || ! $this.has( event.relatedTarget ).length ) {
								$this.pptooltipster('close');
							}
						});
					} else if ( ! $this.is('button, a') ) {
						// Click mode on a role="button" element: wire Enter and Space.
						$this.on('keydown.ppTableTooltip', function ( event ) {
							if ( 'Enter' === event.key || ' ' === event.key || 'Spacebar' === event.key ) {
								event.preventDefault();
								$this.trigger('click');
							}
						});
					}

					// Escape dismisses without moving the pointer (WCAG 1.4.13) and
					// returns focus to the trigger.
					$this.on('keydown.ppTableTooltip', function ( event ) {
						if ( 'Escape' === event.key || 'Esc' === event.key ) {
							if ( isOpen() ) {
								event.stopPropagation();
								$this.pptooltipster('close');
							}
						}
					});

					$(document).on('keydown.ppTableTooltip-' + elementID, function ( event ) {
						if ( 'Escape' === event.key || 'Esc' === event.key ) {
							if ( isOpen() ) {
								$this.pptooltipster('close');
								$this.trigger('focus');
							}
						}
					});
				});
			}
		}

		elementorFrontend.elementsHandler.attachHandler( 'pp-pricing-table', TableWidget );
	} );
})(jQuery);