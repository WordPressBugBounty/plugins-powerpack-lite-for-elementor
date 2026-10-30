( function ( $ ) {
	$( window ).on( 'elementor/frontend/init', () => {

		class NinjaFormsWidget extends elementorModules.frontend.handlers.Base {

			getDefaultSettings() {
				return {
					selectors: {
						wrapper: '.pp-ninja-form',
						formCont: '.nf-form-cont',
						title: '.pp-ninja-forms-title',
						description: '.pp-ninja-forms-description',
						errorBox: '.nf-form-errors',
						errorWrap: '.nf-error-wrap',
						fieldError: '.nf-error-msg',
						responseMsg: '.nf-response-msg',
					},
				};
			}

			getDefaultElements() {
				const selectors = this.getSettings( 'selectors' );

				return {
					$wrapper: this.$element.find( selectors.wrapper ),
					$formCont: this.$element.find( selectors.formCont ),
					$title: this.$element.find( selectors.title ),
					$description: this.$element.find( selectors.description ),
				};
			}

			bindEvents() {
				const ns = '.ppA11y_' + this.getID();

				this.initFormA11y();

				// Ninja Forms trigger on nfFormReady when Marionette renders form layout
				$( document ).on( 'nfFormReady' + ns, ( event, layoutView ) => {
					if ( this.isThisFormView( layoutView ) ) {
						this.initFormA11y();
						this.syncInitialState();
					}
				} );

				// Ninja Forms Marionette Radio events
				if ( window.nfRadio ) {
					const radioForms = window.nfRadio.channel( 'forms' );

					radioForms.on( 'submit:response.ppA11y_' + this.getID(), ( response, textStatus, jqXHR, formId ) => {
						if ( this.isThisFormId( formId ) ) {
							if ( this.hasResponseErrors( response ) ) {
								this.onErrors();
							} else {
								this.onConfirmation();
							}
						}
					} );

					radioForms.on( 'before:submit.ppA11y_' + this.getID(), ( formModel ) => {
						const formId = formModel && formModel.get ? formModel.get( 'id' ) : ( formModel && formModel.id ? formModel.id : null );
						if ( this.isThisFormId( formId ) ) {
							this.onBeforeSubmit();
						}
					} );
				}

				// Standard DOM submission / submit button click
				this.$element.on( 'submit.ppA11y', 'form', () => {
					this.onBeforeSubmit();

					setTimeout( () => {
						if ( this.hasErrors() ) {
							this.onErrors();
						}
					}, 350 );
				} );

				// When user interacts with form fields, sync errors
				this.$element.on( 'blur.ppA11y change.ppA11y input.ppA11y', 'input, textarea, select', () => {
					setTimeout( () => {
						this.syncFieldErrors();
					}, 50 );
				} );

				this.observeMutations();
				this.syncInitialState();
			}

			unbindEvents() {
				$( document ).off( '.ppA11y_' + this.getID() );
				this.$element.off( '.ppA11y' );

				if ( window.nfRadio ) {
					window.nfRadio.channel( 'forms' ).off( '.ppA11y_' + this.getID() );
				}

				if ( this.mutationObserver ) {
					this.mutationObserver.disconnect();
				}
			}

			getFormId() {
				const $cont = this.$element.find( '.nf-form-cont' );
				if ( ! $cont.length ) {
					return null;
				}

				const idAttr = $cont.attr( 'id' ) || '';
				const match = idAttr.match( /nf-form-(\d+)-cont/ );
				if ( match ) {
					return match[1];
				}

				const formElem = $cont.find( 'form' );
				if ( formElem.length && formElem.data( 'form-id' ) ) {
					return formElem.data( 'form-id' );
				}

				return null;
			}

			isThisFormId( formId ) {
				if ( ! formId ) {
					return false;
				}
				const myId = this.getFormId();
				return myId && String( myId ) === String( formId );
			}

			isThisFormView( layoutView ) {
				if ( ! layoutView ) {
					return false;
				}

				if ( layoutView.el && ( this.$element.has( layoutView.el ).length || $( layoutView.el ).is( this.$element ) ) ) {
					return true;
				}

				if ( layoutView.model && layoutView.model.get ) {
					return this.isThisFormId( layoutView.model.get( 'id' ) );
				}

				return false;
			}

			hasResponseErrors( response ) {
				if ( ! response ) {
					return false;
				}

				if ( response.errors ) {
					if ( Array.isArray( response.errors ) && response.errors.length > 0 ) {
						return true;
					}
					if ( typeof response.errors === 'object' ) {
						if ( Object.keys( response.errors ).length > 0 ) {
							if ( response.errors.fields && Object.keys( response.errors.fields ).length > 0 ) {
								return true;
							}
							if ( response.errors.form && Object.keys( response.errors.form ).length > 0 ) {
								return true;
							}
							for ( const k in response.errors ) {
								if ( Object.prototype.hasOwnProperty.call( response.errors, k ) ) {
									const val = response.errors[ k ];
									if ( val && ( Array.isArray( val ) ? val.length > 0 : Object.keys( val ).length > 0 ) ) {
										return true;
									}
								}
							}
						}
					}
				}

				return false;
			}

			hasErrors() {
				const selectors = this.getSettings( 'selectors' );

				return Boolean(
					this.$element.find( selectors.errorBox ).filter( ':visible' ).length ||
					this.$element.find( '.nf-error' ).filter( ':visible' ).length ||
					this.$element.find( selectors.fieldError ).filter( ':visible' ).length
				);
			}

			initFormA11y() {
				const $form  = this.$element.find( 'form' );
				const $title = this.elements.$title && this.elements.$title.length ? this.elements.$title : this.$element.find( '.pp-ninja-forms-title' );
				const $desc  = this.elements.$description && this.elements.$description.length ? this.elements.$description : this.$element.find( '.pp-ninja-forms-description' );

				if ( $form.length ) {
					if ( $title.length && $title.attr( 'id' ) ) {
						$form.attr( 'aria-labelledby', $title.attr( 'id' ) );
					}
					if ( $desc.length && $desc.attr( 'id' ) ) {
						$form.attr( 'aria-describedby', $desc.attr( 'id' ) );
					}
				}

				const $errorBox = this.$element.find( '.nf-form-errors' );
				if ( $errorBox.length ) {
					$errorBox.attr( {
						role: 'alert',
						'aria-live': 'assertive',
						'aria-atomic': 'true',
					} );
				}

				this.initSubmitButtonA11y();
			}

			initSubmitButtonA11y() {
				const $submitBtns = this.$element.find(
					'.submit-container input, .submit-container button, .nf-field-container.submit-container .nf-element, input[type="submit"], input[type="button"].nf-element'
				);

				if ( ! $submitBtns.length ) {
					return;
				}

				$submitBtns.each( ( _, btn ) => {
					const $btn = $( btn );

					// Retrieve readable text for the button
					let btnText = $btn.val() || $btn.attr( 'value' ) || $btn.text() || '';
					if ( ! btnText || ! btnText.trim() ) {
						const $fieldWrap = $btn.closest( '.nf-field-container, .nf-field' );
						const labelInWrap = $fieldWrap.find( '.nf-field-label label, .nf-field-label' ).text();
						btnText = labelInWrap && labelInWrap.trim() ? labelInWrap.trim() : 'Submit';
					}

					btnText = btnText.trim();

					// Ensure accessible name via aria-label so VoiceOver explicitly announces it
					if ( ! $btn.attr( 'aria-label' ) || $btn.attr( 'aria-label' ) !== btnText ) {
						$btn.attr( 'aria-label', btnText );
					}

					// Ensure value is present for native accessible name calculation
					if ( ! $btn.val() || ! $btn.val().trim() ) {
						$btn.val( btnText );
						$btn.attr( 'value', btnText );
					}

					// Ensure keyboard focusable via Tab across all browsers (including Safari)
					if ( ! $btn.attr( 'tabindex' ) ) {
						$btn.attr( 'tabindex', '0' );
					}

					// Ensure button semantics
					if ( ! $btn.attr( 'role' ) && ! $btn.is( 'button' ) && ! $btn.is( 'input[type="submit"]' ) ) {
						$btn.attr( 'role', 'button' );
					}

					// Hide empty wrapper label/error divs in submit container to prevent VoiceOver "empty group" announcement
					const $submitWrap = $btn.closest( '.submit-container, [id$="-wrap"]' );
					$submitWrap.find( '.nf-field-label' ).attr( 'aria-hidden', 'true' );
					$submitWrap.find( '.nf-error-wrap:empty' ).attr( 'aria-hidden', 'true' );
				} );
			}

			observeMutations() {
				const target = this.elements.$wrapper[0] || this.$element[0];
				if ( ! target || ! window.MutationObserver ) {
					return;
				}

				this.mutationObserver = new MutationObserver( ( mutations ) => {
					let shouldCheckErrors = false;
					let shouldCheckSuccess = false;
					let hasNewForm = false;

					for ( const mutation of mutations ) {
						if ( mutation.type === 'childList' ) {
							for ( const node of mutation.addedNodes ) {
								if ( node.nodeType === 1 ) {
									const $node = $( node );
									if ( $node.hasClass( 'nf-response-msg' ) || $node.find( '.nf-response-msg' ).length ) {
										shouldCheckSuccess = true;
									}
									if ( $node.hasClass( 'nf-form-errors' ) || $node.hasClass( 'nf-error-wrap' ) || $node.find( '.nf-error-msg' ).length ) {
										shouldCheckErrors = true;
									}
									if ( $node.is( 'form' ) || $node.find( 'form' ).length || $node.hasClass( 'submit-container' ) || $node.find( '.submit-container' ).length ) {
										hasNewForm = true;
									}
								}
							}
						} else if ( mutation.type === 'attributes' && mutation.attributeName === 'class' ) {
							const $target = $( mutation.target );
							if ( $target.hasClass( 'nf-error' ) || $target.hasClass( 'nf-form-errors' ) ) {
								shouldCheckErrors = true;
							}
						}
					}

					if ( hasNewForm ) {
						this.initFormA11y();
					} else {
						this.initSubmitButtonA11y();
					}

					if ( shouldCheckSuccess ) {
						this.onConfirmation();
					} else if ( shouldCheckErrors ) {
						this.onErrors();
					}
				} );

				this.mutationObserver.observe( target, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: [ 'class' ],
				} );
			}

			syncFieldErrors() {
				const widgetId = this.getID();

				this.$element.find( '.nf-field-container' ).each( ( index, container ) => {
					const $container = $( container );
					const $field     = $container.find( 'input, textarea, select' );
					const isError    = $container.hasClass( 'nf-error' ) || $field.hasClass( 'nf-error' ) || $container.find( '.nf-error-msg' ).filter( ':visible' ).length > 0;

					if ( ! $field.length ) {
						return;
					}

					if ( isError ) {
						$field.attr( 'aria-invalid', 'true' );

						const $errorMsg = $container.find( '.nf-error-msg' );
						if ( $errorMsg.length ) {
							let errId = $errorMsg.attr( 'id' );
							if ( ! errId ) {
								errId = 'pp-nf-err-' + widgetId + '-' + index;
								$errorMsg.attr( 'id', errId );
							}

							const currentDescribedBy = $field.attr( 'aria-describedby' ) || '';
							if ( ! currentDescribedBy.includes( errId ) ) {
								$field.attr( 'aria-describedby', ( currentDescribedBy + ' ' + errId ).trim() );
							}
						}
					} else {
						if ( 'true' === $field.attr( 'aria-invalid' ) ) {
							$field.removeAttr( 'aria-invalid' );
							const $errorMsg = $container.find( '.nf-error-msg' );
							const errId = $errorMsg.attr( 'id' );
							if ( errId ) {
								const currentDescribedBy = $field.attr( 'aria-describedby' ) || '';
								const updatedDescribedBy = currentDescribedBy.replace( errId, '' ).trim();
								if ( updatedDescribedBy ) {
									$field.attr( 'aria-describedby', updatedDescribedBy );
								} else {
									$field.removeAttr( 'aria-describedby' );
								}
							}
						}
					}
				} );
			}

			onBeforeSubmit() {
				const i18n = window.ppNinjaFormsScript || {};
				if ( i18n.submitting ) {
					this.updateStatus( i18n.submitting );
				}
			}

			onErrors() {
				setTimeout( () => {
					const i18n = window.ppNinjaFormsScript || {};

					if ( i18n.form_has_errors ) {
						this.updateStatus( i18n.form_has_errors );
					}

					const $errorBox = this.$element.find( '.nf-form-errors' ).filter( ':visible' ).first();
					if ( $errorBox.length ) {
						$errorBox.attr( {
							role: 'alert',
							'aria-live': 'assertive',
							'aria-atomic': 'true',
						} );
					}

					this.syncFieldErrors();

					// Focus first invalid field so VoiceOver users land directly on it
					const $invalidField = this.$element.find(
						'.nf-error input:visible, .nf-error textarea:visible, .nf-error select:visible, input[aria-invalid="true"]:visible, textarea[aria-invalid="true"]:visible, select[aria-invalid="true"]:visible'
					).first();

					if ( $invalidField.length ) {
						$invalidField.trigger( 'focus' );
					} else if ( $errorBox.length ) {
						if ( ! $errorBox.attr( 'tabindex' ) ) {
							$errorBox.attr( 'tabindex', '-1' );
						}
						$errorBox.trigger( 'focus' );
					}
				}, 100 );
			}

			onConfirmation() {
				setTimeout( () => {
					const $response = this.$element.find( '.nf-response-msg' ).filter( ':visible' ).first();
					if ( $response.length && ! $response.data( 'pp-a11y-handled' ) ) {
						$response.data( 'pp-a11y-handled', true );
						$response.attr( {
							role: 'status',
							'aria-live': 'polite',
							'aria-atomic': 'true',
							tabindex: '-1',
						} );
						$response.trigger( 'focus' );
					}
				}, 100 );
			}

			syncInitialState() {
				const $response = this.$element.find( '.nf-response-msg' ).filter( ':visible' );
				if ( $response.length ) {
					this.onConfirmation();
					return;
				}

				if ( this.hasErrors() ) {
					this.onErrors();
				}
			}

			updateStatus( message ) {
				const statusElem = document.getElementById( 'pp-ninja-forms-status-' + this.getID() );

				if ( ! statusElem ) {
					return;
				}

				statusElem.textContent = '';

				setTimeout( () => {
					statusElem.textContent = message;
				}, 50 );
			}

			onDestroy() {
				this.unbindEvents();

				if ( super.onDestroy ) {
					super.onDestroy();
				}
			}
		}

		elementorFrontend.elementsHandler.attachHandler( 'pp-ninja-forms', NinjaFormsWidget );
	} );
} )( jQuery );
