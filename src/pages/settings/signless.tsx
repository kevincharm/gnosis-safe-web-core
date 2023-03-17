import type { NextPage } from 'next'
import Head from 'next/head'
import { Alert, Button, Grid } from '@mui/material'
import SettingsHeader from '@/components/settings/SettingsHeader'
import SignOrExecuteForm from '@/components/tx/SignOrExecuteForm'
import useSignlessModule from '@/hooks/useSignlessModule'
import TxModal from '@/components/tx/TxModal'
import type { TxStepperProps } from '@/components/tx/TxStepper/useTxStepper'
import useAsync from '@/hooks/useAsync'
import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { useEffect } from 'react'
import { Errors, logError } from '@/services/exceptions'

export const EnableSignless = ({ onSubmit }: { onSubmit: () => void }) => {
  const { enableSignlessModule } = useSignlessModule()
  const [safeTx, safeTxError] = useAsync<SafeTransaction | undefined>(() => {
    return enableSignlessModule()
  }, [enableSignlessModule])

  useEffect(() => {
    if (safeTxError) {
      logError(Errors._69420, safeTxError.message)
    }
  }, [safeTxError])

  const onFormSubmit = () => {
    // trackEvent(SETTINGS_EVENTS.MODULES.REMOVE_MODULE)

    onSubmit()
  }

  return (
    <SignOrExecuteForm safeTx={safeTx} onSubmit={onFormSubmit} error={safeTxError}>
      {/* <SendToBlock address={data.address} title="Module" /> */}
      {/* <Typography my={2}>
        After removing this module, any feature or app that uses this module might no longer work. If this Safe requires
        more then one signature, the module removal will have to be confirmed by other owners as well.
      </Typography> */}
    </SignOrExecuteForm>
  )
}

const steps: TxStepperProps['steps'] = [
  {
    label: 'Enable Signless',
    render: (data, onSubmit) => <EnableSignless onSubmit={onSubmit} />,
  },
]

const Signless: NextPage = () => {
  const { isSignlessEnabled, openEnableSignless, setOpenEnableSignless } = useSignlessModule()
  return (
    <>
      <Head>
        <title>Safe – Settings – Signless Module</title>
      </Head>

      <SettingsHeader />

      <main>
        <Grid container direction="column" spacing={2}>
          <Grid container direction="column" alignItems="center">
            <Grid item xs={6}>
              {isSignlessEnabled && <Alert color="success">Signless is enabled for this Safe.</Alert>}
            </Grid>
            {!isSignlessEnabled && (
              <Grid item xs={6}>
                <Button onClick={() => setOpenEnableSignless(true)}>Enable Signless</Button>
              </Grid>
            )}
          </Grid>
          {openEnableSignless && <TxModal onClose={() => setOpenEnableSignless(false)} steps={steps} />}
        </Grid>
      </main>
    </>
  )
}

export default Signless
