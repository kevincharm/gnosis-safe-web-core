import type { NextPage } from 'next'
import Head from 'next/head'
import { Alert, Button, Grid } from '@mui/material'
import SettingsHeader from '@/components/settings/SettingsHeader'
import SignOrExecuteForm from '@/components/tx/SignOrExecuteForm'
import useSignlessModule, {
  createEnableSignlessModule,
  createRegisterDelegateSignerTx,
} from '@/hooks/useSignlessModule'
import TxModal from '@/components/tx/TxModal'
import type { TxStepperProps } from '@/components/tx/TxStepper/useTxStepper'
import useAsync from '@/hooks/useAsync'
import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { useEffect, useMemo, useState } from 'react'
import { Errors, logError } from '@/services/exceptions'
import useChainId from '@/hooks/useChainId'
import { addDays } from 'date-fns'

const EnableSignless = ({ onSubmit }: { onSubmit: () => void }) => {
  const chainId = useChainId()
  const [safeTx, safeTxError] = useAsync<SafeTransaction | undefined>(() => {
    return createEnableSignlessModule(chainId)
  }, [chainId])

  useEffect(() => {
    if (safeTxError) {
      logError(Errors._69420, safeTxError.message)
    }
  }, [safeTxError])

  const onFormSubmit = () => {
    // trackEvent(SETTINGS_EVENTS.MODULES.REMOVE_MODULE)

    onSubmit()
  }

  return <SignOrExecuteForm safeTx={safeTx} onSubmit={onFormSubmit} error={safeTxError} />
}

const enableSignlessSteps: TxStepperProps['steps'] = [
  {
    label: 'Enable Signless',
    render: (data, onSubmit) => <EnableSignless onSubmit={onSubmit} />,
  },
]

const RegisterDelegate = ({
  data,
  onSubmit,
}: {
  data: { delegateAddress: string; expiry: number }
  onSubmit: () => void
}) => {
  const chainId = useChainId()
  const [safeTx, safeTxError] = useAsync<SafeTransaction | undefined>(() => {
    return createRegisterDelegateSignerTx(chainId, data.delegateAddress, data.expiry)
  }, [chainId])

  useEffect(() => {
    if (safeTxError) {
      logError(Errors._69420, safeTxError.message)
    }
  }, [safeTxError])

  const onFormSubmit = () => {
    // trackEvent(SETTINGS_EVENTS.MODULES.REMOVE_MODULE)

    onSubmit()
  }

  return <SignOrExecuteForm safeTx={safeTx} onSubmit={onFormSubmit} error={safeTxError} />
}

const registerDelegateSteps: TxStepperProps['steps'] = [
  {
    label: 'Register Delegate',
    render: (data, onSubmit) => <RegisterDelegate data={data as any} onSubmit={onSubmit} />,
  },
]

const Signless: NextPage = () => {
  const { isSignlessEnabled, delegatePrivateKey, createLocalDelegate, delegateAddress, isValidDelegate } =
    useSignlessModule()

  const [openEnableSignless, setOpenEnableSignless] = useState<boolean>(false)
  const [openRegisterDelegate, setOpenRegisterDelegate] = useState<boolean>(false)

  // TODO(kevincharm): take expiry from a textfield
  const expiry = useMemo(() => Math.floor(addDays(new Date(), 7).valueOf() / 1000), [])

  return (
    <>
      <Head>
        <title>Safe – Settings – Signless Module</title>
      </Head>

      <SettingsHeader />

      <main>
        <Grid container direction="column" spacing={2} pt={2}>
          <Grid container direction="column" alignItems="center">
            <Grid item xs={6}>
              {isSignlessEnabled ? (
                <Alert color="success">Signless is enabled for this Safe.</Alert>
              ) : (
                <Button variant="contained" onClick={() => setOpenEnableSignless(true)}>
                  Enable Signless
                </Button>
              )}
            </Grid>
            <Grid item xs={6} pt={2}>
              {delegatePrivateKey ? (
                <Alert color="success">
                  Local Signless delegate for this Safe: <code>{delegateAddress}</code>
                </Alert>
              ) : (
                <Button variant="contained" onClick={() => createLocalDelegate()}>
                  Create signless key
                </Button>
              )}
            </Grid>
            <Grid item xs={6} pt={2}>
              {isValidDelegate ? (
                <Alert color="success">
                  <code>{delegateAddress}</code> is registered as a delegate for this Safe (on-chain).
                </Alert>
              ) : (
                delegateAddress && (
                  <Button variant="contained" onClick={() => setOpenRegisterDelegate(true)}>
                    Register {delegateAddress.slice(0, 6)}..{delegateAddress.slice(-4)} as delegate
                  </Button>
                )
              )}
            </Grid>
          </Grid>

          {openEnableSignless && <TxModal onClose={() => setOpenEnableSignless(false)} steps={enableSignlessSteps} />}
          {openRegisterDelegate && (
            <TxModal
              onClose={() => setOpenRegisterDelegate(false)}
              steps={registerDelegateSteps}
              initialData={[{ delegateAddress, expiry }]}
            />
          )}
        </Grid>
      </main>
    </>
  )
}

export default Signless
