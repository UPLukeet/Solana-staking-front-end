import { useEffect, useState } from "react";
import { countDown } from "utils/countDown";
import { INFT } from "utils/web3/NFTget";

export const FarmInfo = ({
  farmer,
  farmerState,
  vaultNfts,
  onStakeClick,
  onUnstakeClick,
}: {
  farmer: any;
  farmerState: any;
  vaultNfts: INFT[];
  onStakeClick: () => void;
  onUnstakeClick: () => void;
}) => {
  const totalUnclaimed = farmer?.rewardB.accruedReward.sub(
    farmer?.rewardB.paidOutReward
  );
  const [timeTillUnlock, setTimeTillUnlock] = useState<number>(
    parseInt(farmer.minStakingEndsTs) - new Date().getTime() / 1000
  );

  let timerStarted = false;
  useEffect(() => {
    if (!timerStarted && timeTillUnlock && timeTillUnlock > 0) {
      setInterval(() => setTimeTillUnlock((prev) => prev && prev - 1), 1000);
      timerStarted = true;
    }
  }, [farmer]);

  return (
    <div className="flex flex-col p-4 bg-neutral rounded-lg mt-10 sm:mt-20">
      <p className="p-3">Accrued rewards: {totalUnclaimed.toString()}</p>
      <div className="flex flex-col p-3">
        {(farmerState === "staked" || farmerState === "pendingCooldown") &&
          timeTillUnlock <= 0 && (
            <>
              <button onClick={onUnstakeClick} className="btn btn-primary">
                End Staking
              </button>
            </>
          )}
        {timeTillUnlock > 0 && farmerState === "staked" && (
          <button disabled={true} className="btn btn-primary">
            End Staking in: {countDown(timeTillUnlock)}
          </button>
        )}
        {vaultNfts.length > 0 && farmerState === "unstaked" && (
          <button onClick={onStakeClick} className="btn btn-primary">
            Stake NFTs
          </button>
        )}
      </div>
    </div>
  );
};
