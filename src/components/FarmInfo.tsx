import { useEffect, useState } from "react";
import { countDown } from "utils/countDown";
import { REWARD_TOKEN } from "utils/gem-farm";
import { INFT } from "utils/web3/NFTget";

export const FarmInfo = ({
  farm,
  farmer,
  farmerState,
  vaultNfts,
  onStakeClick,
  onUnstakeClick,
}: {
  farm: any;
  farmer: any;
  farmerState: any;
  vaultNfts: INFT[];
  onStakeClick: () => void;
  onUnstakeClick: () => void;
}) => {
  const farmerReward = farmer.rewardA;
  const farmRewards = farm.rewardA;
  const recentRewards = parseInt(
    farmerReward.accruedReward.sub(farmerReward.paidOutReward)
  );
  const currentDate = new Date().getTime() / 1000;
  const lastUpdated = parseInt(farmerReward.fixedRate.lastUpdatedTs);
  const denominator = parseInt(farmRewards.fixedRate.schedule.denominator);
  const baseRate = parseInt(farmRewards.fixedRate.schedule.baseRate);

  const gemsStaked = parseInt(farmer.gemsStaked);
  const [timeTillUnlock, setTimeTillUnlock] = useState(0);

  const [accruedReward, setAccruedReward] = useState(0);

  let timerStarted = false;
  let rewardsUpdate = false;
  useEffect(() => {
    setTimeTillUnlock(
      parseInt(farmer.minStakingEndsTs) - new Date().getTime() / 1000
    );
    if (!timerStarted && timeTillUnlock && timeTillUnlock > 0) {
      setInterval(() => setTimeTillUnlock((prev) => prev && prev - 1), 1000);
      timerStarted = true;
    }
  }, [farmer]);

  useEffect(() => {
    setAccruedReward(
      Math.floor(
        recentRewards +
          ((currentDate - lastUpdated) / denominator) * (baseRate * gemsStaked)
      )
    );
    if (!rewardsUpdate) {
      setInterval(
        () => setAccruedReward((prev) => prev && prev + baseRate * gemsStaked),
        denominator * 1000
      );
      rewardsUpdate = true;
    }
  }, []);

  return (
    <div className="flex flex-col p-4 bg-neutral rounded-lg mt-10 sm:mt-20">
      <div className="p-3">
        {farmerState === "staked" && (
          <p className="py-1">
            {REWARD_TOKEN}: {accruedReward}
          </p>
        )}

        <p className={`${farmerState === "staked" ? "text-sm " : "py-1"}`}>
          Per Bape
        </p>
        <p className="text-sm">
          Base rewards: {baseRate} x {denominator}s{" "}
        </p>
        {farmRewards.fixedRate.schedule.tier1 && (
          <p className="text-sm">
            Level 1: {parseInt(farmRewards.fixedRate.schedule.tier1)} x{" "}
            {denominator}s{" "}
          </p>
        )}
        {farmRewards.fixedRate.schedule.tier2 && (
          <p className="text-sm">
            Level 2: {parseInt(farmRewards.fixedRate.schedule.tier2)} x{" "}
            {denominator}s{" "}
          </p>
        )}
        {farmRewards.fixedRate.schedule.tier3 && (
          <p className="text-sm">
            Level 3: {parseInt(farmRewards.fixedRate.schedule.tier3)} x{" "}
            {denominator}s{" "}
          </p>
        )}
      </div>

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
