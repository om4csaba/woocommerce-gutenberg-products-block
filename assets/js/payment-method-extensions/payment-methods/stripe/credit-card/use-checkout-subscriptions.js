/**
 * External dependencies
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { CardElement, CardNumberElement } from '@stripe/react-stripe-js';

/**
 * Internal dependencies
 */
import { PAYMENT_METHOD_NAME } from './constants';
import {
	getStripeServerData,
	getErrorMessageForTypeAndCode,
} from '../stripe-utils';

/**
 * @typedef {import('@woocommerce/type-defs/registered-payment-method-props').EventRegistrationProps} EventRegistrationProps
 * @typedef {import('@woocommerce/type-defs/registered-payment-method-props').PaymentStatusProps} PaymentStatusProps
 * @typedef {import('@woocommerce/type-defs/registered-payment-method-props').BillingDataProps} BillingDataProps
 * @typedef {import('../stripe-utils/type-defs').Stripe} Stripe
 * @typedef {import('react').Dispatch<number>} SourceIdDispatch
 */

/**
 * A custom hook for the Stripe processing and event observer logic.
 *
 * @param {EventRegistrationProps}     eventRegistration Event registration
 *                                                       functions.
 * @param {BillingDataProps}           billing           Various billing data
 *                                                       items.
 * @param {number}                     sourceId          Current set stripe
 *                                                       source id.
 * @param {SourceIdDispatch}           setSourceId       Setter for stripe
 *                                                       source id.
 * @param {boolean}                    shouldSavePayment Whether to save the
 *                                                       payment or not.
 * @param {Stripe}                     stripe            The stripe.js object.
 * @param {Object}                     elements          Stripe Elements object.
 *
 * @return {function(Object):Object} Returns a function for handling stripe error.
 */
export const useCheckoutSubscriptions = (
	eventRegistration,
	billing,
	sourceId,
	setSourceId,
	shouldSavePayment,
	stripe,
	elements
) => {
	const [ error, setError ] = useState( '' );
	const onStripeError = useRef( ( event ) => {
		return event;
	} );
	// hook into and register callbacks for events.
	useEffect( () => {
		onStripeError.current = ( event ) => {
			const type = event.error.type;
			const code = event.error.code || '';
			let message = getErrorMessageForTypeAndCode( type, code );
			message = message || event.error.message;
			setError( error );
			return message;
		};
		const createSource = async ( ownerInfo ) => {
			const elementToGet = getStripeServerData().inline_cc_form
				? CardElement
				: CardNumberElement;
			return await stripe.createSource(
				elements.getElement( elementToGet ),
				{
					type: 'card',
					owner: ownerInfo,
				}
			);
		};
		const onSubmit = async () => {
			try {
				const { billingData } = billing;
				// if there's an error return that.
				if ( error ) {
					return {
						errorMessage: error,
					};
				}
				// use token if it's set.
				if ( sourceId !== 0 ) {
					return {
						paymentMethodData: {
							paymentMethod: PAYMENT_METHOD_NAME,
							paymentRequestType: 'cc',
							sourceId,
							shouldSavePayment,
						},
						billingData,
					};
				}
				const ownerInfo = {
					address: {
						line1: billingData.address_1,
						line2: billingData.address_2,
						city: billingData.city,
						state: billingData.state,
						postal_code: billingData.postcode,
						country: billingData.country,
					},
				};
				if ( billingData.phone ) {
					ownerInfo.phone = billingData.phone;
				}
				if ( billingData.email ) {
					ownerInfo.email = billingData.email;
				}
				if ( billingData.first_name || billingData.last_name ) {
					ownerInfo.name = `${ billingData.first_name } ${ billingData.last_name }`;
				}

				const response = await createSource( ownerInfo );
				if ( response.error ) {
					return {
						errorMessage: onStripeError.current( response ),
					};
				}
				setSourceId( response.source.id );
				return {
					paymentMethodData: {
						sourceId: response.source.id,
						paymentMethod: PAYMENT_METHOD_NAME,
						paymentRequestType: 'cc',
						shouldSavePayment,
					},
					billingData,
				};
			} catch ( e ) {
				return {
					errorMessage: e,
				};
			}
		};
		const unsubscribeProcessing = eventRegistration.onPaymentProcessing(
			onSubmit
		);
		return () => {
			unsubscribeProcessing();
		};
	}, [
		eventRegistration.onCheckoutProcessing,
		eventRegistration.onCheckoutCompleteSuccess,
		eventRegistration.onCheckoutCompleteError,
		stripe,
		sourceId,
		billing.billingData,
		setSourceId,
		shouldSavePayment,
		error,
	] );
	return onStripeError.current;
};
