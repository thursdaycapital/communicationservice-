import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPrivateMsg = await deploy("PrivateMsg", {
    from: deployer,
    log: true,
  });

  console.log(`PrivateMsg contract: `, deployedPrivateMsg.address);
};
export default func;
func.id = "deploy_PrivateMsg"; // id required to prevent reexecution
func.tags = ["PrivateMsg"];
